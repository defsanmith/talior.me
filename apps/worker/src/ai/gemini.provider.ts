import { GoogleGenerativeAI } from "@google/generative-ai";
import { Injectable, Logger } from "@nestjs/common";
import {
  ParsedJD,
  ParsedJDSchema,
  ProfileEvaluation,
  ProfileEvaluationSchema,
  RewrittenBullet,
} from "@tailor.me/shared";
import {
  ContentSelection,
  IAIProvider,
  ProfileData,
} from "./ai-provider.interface";

@Injectable()
export class GeminiProvider implements IAIProvider {
  private readonly logger = new Logger(GeminiProvider.name);
  private client: GoogleGenerativeAI;
  private readonly parseModel: string;
  private readonly rewriteModel: string;
  private readonly selectionModel: string;
  private readonly evaluationModel: string;

  constructor() {
    this.client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    this.parseModel = process.env.GEMINI_PARSE_MODEL || "gemini-2.5-flash";
    this.rewriteModel = process.env.GEMINI_REWRITE_MODEL || "gemini-2.5-flash";
    this.selectionModel =
      process.env.GEMINI_SELECTION_MODEL || "gemini-2.5-flash";
    this.evaluationModel =
      process.env.GEMINI_EVALUATION_MODEL || "gemini-2.5-flash";
  }

  private handleError(error: any, operation: string): never {
    this.logger.error(`Gemini API error during ${operation}:`, error.message);

    if (error.status === 429) {
      throw new Error(
        `Gemini API rate limit exceeded during ${operation}. ` +
          `Please upgrade your Gemini API plan or switch to OpenAI provider. ` +
          `Error: ${error.message}`,
      );
    }

    if (error.status === 401 || error.status === 403) {
      throw new Error(
        `Gemini API authentication failed during ${operation}. ` +
          `Please check your GEMINI_API_KEY. Error: ${error.message}`,
      );
    }

    throw new Error(
      `Gemini API request failed during ${operation}: ${error.message}`,
    );
  }

  async parseJobDescription(jobDescription: string): Promise<ParsedJD> {
    try {
      const model = this.client.getGenerativeModel({
        model: this.parseModel,
        generationConfig: {
          responseMimeType: "application/json",
        },
      });

      const prompt = `You are a technical recruiter parsing a job description into a structured format for a resume optimization system.

Extract exactly four arrays:

required_skills: Technical and soft skills that are EXPLICITLY required ("must have", "required", "you will need"). Include specific technologies, languages, and frameworks. Do NOT include vague terms like "experience" or "background".

nice_to_have: Skills explicitly marked as preferred, bonus, or nice-to-have. If ambiguous, exclude from this array.

responsibilities: 5-10 key duties. Write each as a verb phrase ("Build and maintain...", "Design APIs..."). Exclude company culture and benefits.

keywords: Domain buzzwords, methodology terms, and industry jargon that appear in the JD but are NOT already in required_skills or nice_to_have. Examples: "distributed systems", "agile", "high-availability". IMPORTANT: Do not duplicate items already in required_skills or nice_to_have.

Also extract:
- companyName: The employer's name (string or null)
- jobPosition: The exact job title (string or null)
- teamName: The specific team name if stated (string or null)

Parse this job description:

${jobDescription}

Return JSON with:
- required_skills (array)
- nice_to_have (array)
- responsibilities (array)
- keywords (array)
- companyName: the company name (string or null)
- jobPosition: the job title/position (string or null)
- teamName: the team name if mentioned (string or null)

Before returning, verify: are there any strings that appear in both required_skills and keywords? If yes, remove them from keywords. Return the corrected JSON.`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      const parsed = JSON.parse(text);
      return ParsedJDSchema.parse(parsed);
    } catch (error) {
      this.handleError(error, "parseJobDescription");
    }
  }

  async rewriteBullet(
    bullet: { id: string; content: string; tags: string[]; skills: string[] },
    jd: ParsedJD,
  ): Promise<RewrittenBullet> {
    try {
      const model = this.client.getGenerativeModel({
        model: this.rewriteModel,
        generationConfig: {
          responseMimeType: "application/json",
        },
      });

      const prompt = `You are a professional career coach who helps software engineers rewrite resume bullets to better match a specific job description, without inventing new information.

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
- riskFlags: array of any concerns (empty array if none)

Original bullet: "${bullet.content}"
Skills/Tags: ${[...bullet.skills, ...bullet.tags].join(", ")}

Job requires: ${jd.required_skills.join(", ")}
Keywords: ${jd.keywords.join(", ")}

Rewrite to emphasize relevance while staying 100% grounded in the original content.`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      const parsed = JSON.parse(text);
      const rewrittenText = parsed.rewrittenText?.trim();
      const riskFlags: string[] = parsed.riskFlags || [];
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

      const model = this.client.getGenerativeModel({
        model: this.selectionModel,
        generationConfig: {
          responseMimeType: "application/json",
        },
      });

      const allBulletIds = [
        ...profile.experiences.flatMap((e) => e.bullets.map((b) => b.id)),
        ...profile.projects.flatMap((p) => p.bullets.map((b) => b.id)),
      ];

      const prompt = `You are a professional career coach with hiring manager expertise, helping software engineers strategically select resume content for specific job opportunities.

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
- You MUST only use IDs that appear in the VALID IDs section below
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
}

JOB REQUIREMENTS:
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
Valid bullet IDs: ${allBulletIds.join(", ") || "none"}

Select the most relevant content for this job application.`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      const parsed = JSON.parse(text);

      // Validate and return with defaults
      return {
        experiences: parsed.experiences || [],
        projects: parsed.projects || [],
        education: parsed.education || [],
      };
    } catch (error) {
      this.handleError(error, "selectRelevantContent");
    }
  }

  async evaluateProfileFit(
    profile: ProfileData,
    parsedJd: ParsedJD,
    jobDescription: string,
  ): Promise<ProfileEvaluation> {
    try {
      const model = this.client.getGenerativeModel({
        model: this.evaluationModel,
        generationConfig: {
          responseMimeType: "application/json",
        },
      });

      const experiencesSummary = profile.experiences
        .map(
          (exp) =>
            `- ${exp.title} at ${exp.company} (${exp.startDate} – ${exp.endDate || "Present"}): ${exp.bullets.length} bullets. Skills: ${exp.bullets.flatMap((b) => b.skills).filter((v, i, a) => a.indexOf(v) === i).join(", ") || "none"}`,
        )
        .join("\n");

      const projectsSummary = profile.projects
        .map(
          (proj) =>
            `- ${proj.name}: ${proj.bullets.length} bullets. Skills: ${proj.skills.join(", ") || "none"}`,
        )
        .join("\n");

      const educationSummary = profile.education
        .map(
          (edu) =>
            `- ${edu.degree} at ${edu.institution} (${edu.graduationDate || "N/A"})`,
        )
        .join("\n");

      const allSkills = profile.skillCategories
        .flatMap((cat) => cat.skills.map((s) => s.name))
        .join(", ");

      const certsSummary =
        profile.certifications
          ?.map((c) => `- ${c.title} (${c.issuer})`)
          .join("\n") || "None";

      const prompt = `You are a senior technical recruiter performing a rigorous fit assessment between a candidate's profile and a job description.

Evaluate across 5 dimensions, each scored 1–5:

1. Skills Alignment (weight: 0.30)
   1 = <30% of required skills present
   3 = 50–70% of required skills present
   5 = >90% of required skills present, including nice-to-haves

2. Experience Relevance (weight: 0.25)
   1 = No relevant experience for the role's responsibilities
   3 = Some transferable experience from adjacent domains
   5 = Direct, recent experience performing the same responsibilities

3. Seniority Fit (weight: 0.20)
   1 = >3 levels off (junior applying to director)
   3 = 1 level off, could stretch
   5 = Exact level match based on years and scope

4. Domain Match (weight: 0.15)
   1 = Completely different industry and problem space
   3 = Adjacent industry with transferable patterns
   5 = Same industry, similar company type and scale

5. Posting Quality (weight: 0.10)
   1 = Vague, no specific requirements, suspicious
   3 = Standard posting with some gaps
   5 = Well-specified, detailed, legitimate

GAP ANALYSIS RULES:
For each required skill or responsibility where the candidate falls short, classify as:
- "hard-blocker": Fundamental requirement the candidate cannot demonstrate
- "moderate": Significant gap but potentially mitigatable through adjacent experience
- "nice-to-have": Listed as required but commonly waived for strong candidates

STRENGTHS: List 3–5 specific areas where the candidate's profile strongly matches.

SUMMARY: Write 2–3 sentences describing the overall fit from a recruiter's perspective.

Return ONLY valid JSON matching this exact schema:
{
  "overallScore": <weighted average of dimensions, 1 decimal>,
  "dimensions": [
    { "name": "<dimension name>", "score": <1-5>, "weight": <0.xx>, "reasoning": "<1-2 sentences>" }
  ],
  "gaps": [
    { "requirement": "<what's missing>", "severity": "<hard-blocker|moderate|nice-to-have>", "detail": "<explanation>", "mitigationSuggestion": "<optional suggestion>" }
  ],
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "recommendation": "<strong-fit|moderate-fit|weak-fit>",
  "summary": "<2-3 sentence verdict>",
  "autoGenerate": false
}

The "autoGenerate" field should always be false — the caller will set this based on the user's threshold preference. Compute "recommendation" based on overallScore: >=4.0 is "strong-fit", 3.0–3.99 is "moderate-fit", <3.0 is "weak-fit".

JOB DESCRIPTION (raw):
${jobDescription}

PARSED REQUIREMENTS:
Required Skills: ${parsedJd.required_skills.join(", ")}
Nice to Have: ${parsedJd.nice_to_have.join(", ")}
Responsibilities: ${parsedJd.responsibilities.join("; ")}
Keywords: ${parsedJd.keywords.join(", ")}
Company: ${parsedJd.companyName || "Unknown"}
Position: ${parsedJd.jobPosition || "Unknown"}

CANDIDATE PROFILE:

Experiences:
${experiencesSummary || "None"}

Projects:
${projectsSummary || "None"}

Education:
${educationSummary || "None"}

All Skills: ${allSkills || "None listed"}

Certifications:
${certsSummary}

Evaluate this candidate's fit for the role.`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      const parsed = JSON.parse(text);
      return ProfileEvaluationSchema.parse(parsed);
    } catch (error) {
      this.handleError(error, "evaluateProfileFit");
    }
  }
}
