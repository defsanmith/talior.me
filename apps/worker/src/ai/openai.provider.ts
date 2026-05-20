import { Injectable, Logger } from "@nestjs/common";
import { ParsedJD, ParsedJDSchema, RewrittenBullet } from "@tailor.me/shared";
import OpenAI from "openai";
import {
  ContentSelection,
  IAIProvider,
  ProfileData,
} from "./ai-provider.interface";

@Injectable()
export class OpenAIProvider implements IAIProvider {
  private readonly logger = new Logger(OpenAIProvider.name);
  private client: OpenAI;
  private readonly parseModel: string;
  private readonly rewriteModel: string;
  private readonly selectionModel: string;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.parseModel = process.env.OPENAI_PARSE_MODEL || "gpt-4o-mini";
    this.rewriteModel = process.env.OPENAI_REWRITE_MODEL || "gpt-4o-mini";
    this.selectionModel = process.env.OPENAI_SELECTION_MODEL || "gpt-4o-mini";
  }

  private handleError(error: any, operation: string): never {
    this.logger.error(`OpenAI API error during ${operation}:`, error.message);

    if (error.status === 429) {
      throw new Error(
        `OpenAI API rate limit exceeded during ${operation}. ` +
          `Please check your OpenAI API plan or wait before retrying. ` +
          `Error: ${error.message}`,
      );
    }

    if (error.status === 401 || error.status === 403) {
      throw new Error(
        `OpenAI API authentication failed during ${operation}. ` +
          `Please check your OPENAI_API_KEY. Error: ${error.message}`,
      );
    }

    if (error.code === "insufficient_quota") {
      throw new Error(
        `OpenAI API quota exceeded during ${operation}. ` +
          `Please add credits to your OpenAI account. Error: ${error.message}`,
      );
    }

    throw new Error(
      `OpenAI API request failed during ${operation}: ${error.message}`,
    );
  }

  async parseJobDescription(jobDescription: string): Promise<ParsedJD> {
    try {
      const completion = await this.client.chat.completions.create({
        model: this.parseModel,
        messages: [
          {
            role: "system",
            content: `You are a technical recruiter parsing a job description into a structured format for a resume optimization system.

Extract exactly four arrays:

required_skills: Technical and soft skills that are EXPLICITLY required ("must have", "required", "you will need"). Include specific technologies, languages, and frameworks. Do NOT include vague terms like "experience" or "background".

nice_to_have: Skills explicitly marked as preferred, bonus, or nice-to-have. If ambiguous, exclude from this array.

responsibilities: 5-10 key duties. Write each as a verb phrase ("Build and maintain...", "Design APIs..."). Exclude company culture and benefits.

keywords: Domain buzzwords, methodology terms, and industry jargon that appear in the JD but are NOT already in required_skills or nice_to_have. Examples: "distributed systems", "agile", "high-availability". IMPORTANT: Do not duplicate items already in required_skills or nice_to_have.

Also extract:
- companyName: The employer's name (string or null)
- jobPosition: The exact job title (string or null)
- teamName: The specific team name if stated (string or null)

Return only valid JSON.`,
          },
          {
            role: "user",
            content: `Parse this job description:\n\n${jobDescription}\n\nReturn JSON with:\n- required_skills (array)\n- nice_to_have (array)\n- responsibilities (array)\n- keywords (array)\n- companyName: the company name (string or null)\n- jobPosition: the job title/position (string or null)\n- teamName: the team name if mentioned (string or null)\n\nBefore returning, verify: are there any strings that appear in both required_skills and keywords? If yes, remove them from keywords. Return the corrected JSON.`,
          },
        ],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");
      return ParsedJDSchema.parse(result);
    } catch (error) {
      this.handleError(error, "parseJobDescription");
    }
  }

  async rewriteBullet(
    bullet: { id: string; content: string; tags: string[]; skills: string[] },
    jd: ParsedJD,
  ): Promise<RewrittenBullet> {
    try {
      const completion = await this.client.chat.completions.create({
        model: this.rewriteModel,
        messages: [
          {
            role: "system",
            content: `You are a professional career coach who helps software engineers rewrite resume bullets to better match a specific job description, without inventing new information.

ABSOLUTE CONSTRAINTS (violations cause the bullet to be rejected):
- DO NOT add any number, percentage, or metric not present in the original bullet
- DO NOT mention any technology, framework, or tool not in the original bullet or its skills/tags
- DO NOT claim new responsibilities or leadership (led, managed, owned) not stated in the original
- DO NOT invent scale, scope, or impact not in the original

YOUR ONLY TOOLS:
- Reorder the information to front-load the most job-relevant content
- Replace generic verbs with stronger synonyms that keep the same meaning (e.g. "worked on" → "developed")
- Restructure the sentence to match "Action Verb + What + Impact/Context" format
- Use job description terminology where it naturally maps to what the original already says
- Precision: Only use numbers and metrics that appear verbatim in the original bullet

STYLE RULES:
- Output exactly one line, under 20 words when possible, never more than 30 words
- Start with an action verb in past tense
- Do not start with the same verb as sibling bullets in the same experience

Return JSON with:
- bulletId: the bullet ID
- rewrittenText: the rewritten bullet (one line, no trailing period)
- evidenceBulletIds: [bulletId] (always just the original bullet)
- riskFlags: array of any concerns (empty array if none)`,
          },
          {
            role: "user",
            content: `Original bullet: "${bullet.content}"
Skills/Tags: ${[...bullet.skills, ...bullet.tags].join(", ")}

Job requires: ${jd.required_skills.join(", ")}
Keywords: ${jd.keywords.join(", ")}

Rewrite to emphasize relevance while staying 100% grounded in the original content.`,
          },
        ],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");
      const rewrittenText = result.rewrittenText?.trim();
      const riskFlags: string[] = result.riskFlags || [];
      if (!rewrittenText || rewrittenText === bullet.content.trim()) {
        this.logger.warn(`Bullet ${bullet.id} was not rewritten by model`);
        riskFlags.push("no_rewrite");
      }
      return {
        bulletId: bullet.id,
        rewrittenText: rewrittenText || bullet.content,
        evidenceBulletIds: [bullet.id],
        riskFlags,
      };
    } catch (error) {
      this.handleError(error, `rewriteBullet (${bullet.id})`);
    }
  }

  async selectRelevantContent(
    profile: ProfileData,
    parsedJd: ParsedJD,
  ): Promise<ContentSelection> {
    try {
      // Format profile data for the prompt
      const experiencesText = profile.experiences
        .map(
          (exp) =>
            `Experience [${exp.id}]: ${exp.title} at ${exp.company} (${exp.startDate} - ${exp.endDate || "Present"})
  Bullets:
${exp.bullets.map((b) => `    - [${b.id}] ${b.content} (Skills: ${b.skills.join(", ") || "none"})`).join("\n")}`,
        )
        .join("\n\n");

      const projectsText = profile.projects
        .map(
          (proj) =>
            `Project [${proj.id}]: ${proj.name} (Skills: ${proj.skills.join(", ") || "none"})
  Bullets:
${proj.bullets.map((b) => `    - [${b.id}] ${b.content}`).join("\n")}`,
        )
        .join("\n\n");

      const educationText = profile.education
        .map(
          (edu) =>
            `Education [${edu.id}]: ${edu.degree} at ${edu.institution} (${edu.graduationDate || "N/A"})
  Coursework: ${edu.coursework.join(", ") || "none"}`,
        )
        .join("\n\n");

      const skillsText = profile.skillCategories
        .map(
          (cat) =>
            `Category [${cat.id}]: ${cat.name}
  Skills: ${cat.skills.map((s) => `[${s.id}] ${s.name}`).join(", ")}`,
        )
        .join("\n\n");

      const completion = await this.client.chat.completions.create({
        model: this.selectionModel,
        messages: [
          {
            role: "system",
            content: `You are a professional career coach with hiring manager expertise, helping software engineers strategically select resume content for specific job opportunities.

Your task: Analyze the job requirements from a hiring manager's perspective and recommend which experiences from the master resume should be prioritized to maximize interview chances.

HIRING MANAGER PERSPECTIVE:
1. **Identify key strengths**: What would make an ideal candidate stand out?
2. **Recognize gaps**: What areas typically need attention for this role?
3. **Strategic selection**: Which experiences demonstrate the strongest fit?

SELECTION STRATEGY:
- Select ALL experiences if the candidate has 3 or fewer; otherwise select the 3-4 most relevant
- Select ALL projects if the candidate has 2 or fewer; otherwise select the 2-3 most relevant
- From each selected experience or project, choose 2-5 bullets that directly align with essential and preferred skills (choose fewer if the item has fewer than 2 bullets)
- If the job description is short or generic, prioritize recency over strict keyword matching
- Include all education entries but only coursework strings verbatim from the provided "Coursework" list
- Prioritize recent experiences and measurable achievements
- Focus on transferable skills and domain-specific expertise
- Consider both explicit skill matches and implicit competency signals
- Think: "What would make this candidate get invited for an interview?"

REASONING PROCESS (think step by step before writing JSON):
1. List the top 3 required skills from the job
2. For each experience, score it 1-5 on relevance to those skills
3. Select experiences scoring 4+, or the top 3 by score if none score 4+
4. For each selected experience, pick bullets that contain those top skills
Include your reasoning in the relevanceReason field of each item.

CRITICAL ID RULES:
- You MUST only use IDs that appear in the VALID IDs section of the user message
- Using any ID not in that list is an error that will break the system
- selectedCoursework must contain only exact strings from the candidate's "Coursework" list

Return a JSON object with this exact structure:
{
  "experiences": [
    {
      "id": "experience_id",
      "bulletIds": ["bullet_id1", "bullet_id2", ...],
      "relevanceReason": "Why this experience helps the candidate stand out for this role"
    }
  ],
  "projects": [
    {
      "id": "project_id",
      "bulletIds": ["bullet_id1", ...],
      "relevanceReason": "How this project demonstrates key skills for the position"
    }
  ],
  "education": [
    {
      "id": "education_id",
      "selectedCoursework": ["Course 1", "Course 2"],
      "relevanceReason": "Why this coursework is relevant"
    }
  ]
}`,
          },
          {
            role: "user",
            content: `JOB REQUIREMENTS:
Required Skills: ${parsedJd.required_skills.join(", ")}
Nice to Have: ${parsedJd.nice_to_have.join(", ")}
Responsibilities: ${parsedJd.responsibilities.join("; ")}
Keywords: ${parsedJd.keywords.join(", ")}

CANDIDATE PROFILE:

=== EXPERIENCES ===
${experiencesText || "No experiences listed"}

=== PROJECTS ===
${projectsText || "No projects listed"}

=== EDUCATION ===
${educationText || "No education listed"}

=== SKILLS ===
${skillsText || "No skills listed"}

VALID IDs — you MUST only use IDs from these exact lists:
Valid experience IDs: ${profile.experiences.map((e) => e.id).join(", ") || "none"}
Valid project IDs: ${profile.projects.map((p) => p.id).join(", ") || "none"}
Valid education IDs: ${profile.education.map((e) => e.id).join(", ") || "none"}
Valid bullet IDs: ${[...profile.experiences.flatMap((e) => e.bullets.map((b) => b.id)), ...profile.projects.flatMap((p) => p.bullets.map((b) => b.id))].join(", ") || "none"}

Select the most relevant content for this job application.`,
          },
        ],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");

      // Validate and return with defaults
      return {
        experiences: result.experiences || [],
        projects: result.projects || [],
        education: result.education || [],
      };
    } catch (error) {
      this.handleError(error, "selectRelevantContent");
    }
  }
}
