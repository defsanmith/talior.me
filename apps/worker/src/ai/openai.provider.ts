import { Injectable, Logger } from "@nestjs/common";
import {
  ParsedJD,
  ParsedJDSchema,
  ProfileEvaluation,
  ProfileEvaluationSchema,
  RewrittenBullet,
} from "@tailor.me/shared";
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
  private readonly evaluationModel: string;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.parseModel = process.env.OPENAI_PARSE_MODEL || "gpt-4o-mini";
    this.rewriteModel = process.env.OPENAI_REWRITE_MODEL || "gpt-4o-mini";
    this.selectionModel = process.env.OPENAI_SELECTION_MODEL || "gpt-4o-mini";
    this.evaluationModel = process.env.OPENAI_EVALUATION_MODEL || "gpt-4o";
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
            content: `You are a senior technical recruiter parsing a job description into a structured format for a resume optimization system.

STEP 1 — CLASSIFY THE ROLE:
Before extracting details, classify the posting along three axes:

seniorityLevel: Infer from title, years-of-experience requirement, scope of responsibilities, and reporting structure.
  "intern" | "junior" (0-2 yrs) | "mid" (2-5 yrs) | "senior" (5-8 yrs) | "staff" (8-12 yrs) | "principal" (12+ yrs) | "director" | "vp" | "unknown"

remotePolicy: Look for explicit statements ("remote", "hybrid", "in-office", office location requirements).
  "remote" | "hybrid" | "onsite" | "unknown"

roleArchetype: Classify the primary function of the role.
  "backend" | "frontend" | "fullstack" | "devops" | "data" | "ml" | "mobile" | "security" | "management" | "other"

STEP 2 — EXTRACT STRUCTURED DATA:

required_skills: Technical and soft skills that are EXPLICITLY required ("must have", "required", "you will need"). Include specific technologies, languages, and frameworks. Do NOT include vague terms like "experience" or "background".

nice_to_have: Skills explicitly marked as preferred, bonus, or nice-to-have. If ambiguous, exclude from this array.

responsibilities: 5-10 key duties. Write each as a verb phrase ("Build and maintain...", "Design APIs..."). Exclude company culture, benefits, and boilerplate.

keywords: Domain buzzwords, methodology terms, and industry jargon that appear in the JD but are NOT already in required_skills or nice_to_have. Examples: "distributed systems", "agile", "high-availability". IMPORTANT: Do not duplicate items already in required_skills or nice_to_have.

Metadata:
- companyName: The employer's name (string or null)
- jobPosition: The exact job title as written (string or null)
- teamName: The specific team name if stated (string or null)

SELF-VERIFICATION (do this before returning):
1. Are there any strings that appear in both required_skills and keywords? If yes, remove them from keywords.
2. Does every item in required_skills represent a concrete, assessable skill (not a vague trait)? Remove any that don't.
3. Is seniorityLevel consistent with the years-of-experience mentioned? Adjust if not.

Return only valid JSON.`,
          },
          {
            role: "user",
            content: `Parse this job description:\n\n${jobDescription}`,
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
            content: `You are a professional career coach who helps software engineers rewrite resume bullets to better match a specific job description. You use ethical keyword injection: weaving JD vocabulary into existing experience without inventing anything.

ABSOLUTE CONSTRAINTS (violations cause the bullet to be rejected):
- DO NOT add any number, percentage, or metric not present in the original bullet
- DO NOT mention any technology, framework, or tool not in the original bullet or its skills/tags
- DO NOT claim new responsibilities or leadership (led, managed, owned) not stated in the original
- DO NOT invent scale, scope, or impact not in the original
- DO NOT fabricate outcomes, results, or achievements

ETHICAL KEYWORD INJECTION:
Your primary technique is mapping the candidate's existing language to JD terminology:
- If the original says "built a data pipeline" and the JD says "ETL", rewrite as "Built ETL data pipeline..."
- If the original says "worked with cloud services" and their skills include "AWS", rewrite as "Developed cloud infrastructure on AWS..."
- Only inject keywords where there is a genuine semantic match between what the candidate did and what the JD asks for

BANNED WORDS AND CLICHES — never use these:
"leveraged", "utilized", "spearheaded", "facilitated", "passionate", "synergy", "stakeholders", "cross-functional", "best-in-class", "results-oriented", "proven track record", "cutting-edge"
Prefer plain, strong verbs: built, led, designed, shipped, reduced, automated, migrated, implemented, ran, created, wrote, tested, deployed

STYLE RULES:
- Structure: Action Verb + What + Impact/Context
- Output exactly one line, under 20 words when possible, never more than 30 words
- Start with a past-tense action verb
- No trailing period
- Front-load the most JD-relevant content

SELF-VERIFICATION (do this before returning):
1. Does the rewritten bullet contain any technology, metric, or claim NOT present in the original or its skills/tags? If yes, remove it.
2. Did you use any banned word? If yes, replace it.
3. Is the core meaning preserved? If the original is about X, the rewrite must still be about X.

Return JSON with:
- bulletId: the bullet ID
- rewrittenText: the rewritten bullet
- evidenceBulletIds: [bulletId] (always just the original bullet)
- riskFlags: array of any concerns (empty array if none). Flag "keyword_injected" if you mapped JD terminology onto existing content.`,
          },
          {
            role: "user",
            content: `Original bullet: "${bullet.content}"
Skills/Tags: ${[...bullet.skills, ...bullet.tags].join(", ")}

JD required skills: ${jd.required_skills.join(", ")}
JD keywords: ${jd.keywords.join(", ")}

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
            content: `You are a professional career coach with hiring manager expertise, helping software engineers strategically select and prioritize resume content for specific job opportunities.

STEP 1 — KEYWORD EXTRACTION (do this first, mentally):
Identify the 10-15 most important keywords from the job requirements. These are the terms the hiring manager will scan for. They include required skills, domain terms, and key responsibilities.

STEP 2 — HIRING MANAGER PERSPECTIVE:
Think like the hiring manager reading a stack of 200 resumes:
1. What are the 3 must-have signals that earn a closer look?
2. Which experiences demonstrate those signals most directly?
3. Do the selected items together tell a coherent career narrative toward this role?

SELECTION STRATEGY:
- Select ALL experiences if the candidate has 3 or fewer; otherwise select the 3-4 most relevant
- Select ALL projects if the candidate has 2 or fewer; otherwise select the 2-3 most relevant
- From each selected experience or project, choose 2-5 bullets that directly align with essential and preferred skills (choose fewer if the item has fewer than 2 bullets)
- If the job description is short or generic, prioritize recency over strict keyword matching
- Include all education entries but only coursework strings verbatim from the provided "Coursework" list
- Prioritize recent experiences and measurable achievements
- Consider both explicit skill matches and implicit competency signals (e.g., "built distributed system" implies "scalability" even if the word isn't used)

ORDERING:
Return experiences and projects in PRIORITY ORDER — the most relevant item first. The resume will present them in this order. The first experience should be the one that most directly maps to the target role.

NARRATIVE COHERENCE:
The selected items should together demonstrate a clear career trajectory toward this role. Avoid selecting items that tell contradictory stories (e.g., don't mix deep backend work with UI-heavy projects if the role is purely backend).

REASONING PROCESS (think step by step before writing JSON):
1. List the top 3 required skills from the job
2. For each experience, score it 1-5 on relevance to those skills
3. Select experiences scoring 4+, or the top 3 by score if none score 4+
4. For each selected experience, pick bullets containing those top skills or demonstrating transferable competency
5. Order selections: highest relevance first
Include your reasoning in the relevanceReason field of each item.

CRITICAL ID RULES:
- You MUST only use IDs that appear in the VALID IDs section of the user message
- Using any ID not in that list is an error that will break the system
- selectedCoursework must contain only exact strings from the candidate's "Coursework" list

SELF-VERIFICATION:
Before returning, check: does every ID in your response appear in the VALID IDs list? If not, remove it.

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
${parsedJd.roleArchetype ? `Role Archetype: ${parsedJd.roleArchetype}` : ""}
${parsedJd.seniorityLevel ? `Seniority: ${parsedJd.seniorityLevel}` : ""}

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

Select and prioritize the most relevant content for this job application.`,
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

  async evaluateProfileFit(
    profile: ProfileData,
    parsedJd: ParsedJD,
    jobDescription: string,
  ): Promise<ProfileEvaluation> {
    try {
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

      const completion = await this.client.chat.completions.create({
        model: this.evaluationModel,
        messages: [
          {
            role: "system",
            content: `You are a senior technical recruiter performing a rigorous, multi-step fit assessment between a candidate's profile and a job description. Think like a hiring manager reviewing the top of a 200-applicant funnel.

STEP 1 — SKILL-BY-SKILL MAPPING:
Before scoring, map EACH required skill from the JD to evidence in the candidate's profile:
- For each required skill, find the closest match in the candidate's experiences, projects, skills list, or education.
- If there is a direct match, note which experience/project demonstrates it.
- If there is an adjacent/transferable match, note the gap and how the candidate might frame it.
- If there is no match at all, flag it as a gap.

This mapping is the foundation for accurate scoring. Do not score without completing it.

STEP 2 — DIMENSION SCORING (5 dimensions, each 1–5):

1. Skills Alignment (weight: 0.30)
   1 = <30% of required skills have ANY evidence in the profile
   2 = 30–49% coverage, multiple hard requirements missing
   3 = 50–70% coverage, core skills present but notable gaps
   4 = 70–90% coverage, most required skills present with evidence
   5 = >90% coverage including nice-to-haves, with direct experience

2. Experience Relevance (weight: 0.25)
   1 = No experience maps to the role's core responsibilities
   2 = Tangentially related experience only
   3 = Some transferable experience from adjacent domains or roles
   4 = Strong transferable experience, similar scope and responsibility
   5 = Direct, recent experience performing the same responsibilities at similar scale

3. Seniority Fit (weight: 0.20)
   1 = >3 levels off (e.g., intern applying to senior)
   2 = 2 levels off, significant stretch
   3 = 1 level off, could stretch with strong interview
   4 = Close match, within normal hiring range
   5 = Exact level match based on years, scope, and demonstrated leadership

4. Domain Match (weight: 0.15)
   1 = Completely different industry and problem space
   2 = Different industry, some transferable patterns
   3 = Adjacent industry or similar company type
   4 = Same industry, different company scale/stage
   5 = Same industry, similar company type and scale

5. Posting Quality (weight: 0.10)
   Evaluate the posting itself for legitimacy and specificity. Look for these signals:
   - Tech specificity: Does it name exact tools/versions or just buzzwords?
   - Requirements realism: Are requirements internally consistent (e.g., not "5 years React" for a junior role)?
   - Detail level: Does it describe actual projects/team structure?
   - Red flags: Reposted frequently? Unrealistic scope? No salary info for regulated markets?
   1 = Vague, contradictory, or suspicious (possible ghost job)
   3 = Standard posting with some missing details
   5 = Well-specified, detailed, internally consistent, legitimate

STEP 3 — GAP ANALYSIS:
For EVERY required skill or responsibility where the candidate falls short, create a gap entry:
- "hard-blocker": Fundamental requirement the candidate cannot demonstrate AND cannot reasonably frame around (e.g., specific certification required by law, 10+ years when they have 2)
- "moderate": Significant gap but mitigatable — the candidate has adjacent experience that could be framed
- "nice-to-have": Listed as required but commonly waived for strong candidates in practice

MANDATORY: Every gap MUST include a mitigationSuggestion with specific, actionable framing advice. Examples:
- "Frame your X experience as evidence of Y capability — both involve Z"
- "Highlight your coursework in X and self-directed project Y to bridge this gap"
- "This is typically waived if the candidate demonstrates strong fundamentals in Z"

STEP 4 — STRENGTHS & SUMMARY:
- Strengths: List 3–5 specific areas where the candidate's profile strongly matches. Be concrete — reference specific experiences, not generic traits.
- Summary: Write 2–3 sentences describing the overall fit from a recruiter's perspective. Include the single strongest signal and the single biggest concern.

SELF-VERIFICATION:
1. Does overallScore equal the weighted average of your dimension scores (to 1 decimal)?
2. Is every required skill accounted for — either in strengths or in gaps?
3. Does the recommendation label match the score (>=4.0 strong-fit, 3.0–3.99 moderate-fit, <3.0 weak-fit)?

Return ONLY valid JSON matching this exact schema:
{
  "overallScore": <weighted average, 1 decimal>,
  "dimensions": [
    { "name": "<dimension name>", "score": <1-5>, "weight": <0.xx>, "reasoning": "<2-3 sentences citing specific evidence>" }
  ],
  "gaps": [
    { "requirement": "<what's missing>", "severity": "<hard-blocker|moderate|nice-to-have>", "detail": "<explanation>", "mitigationSuggestion": "<specific framing advice>" }
  ],
  "strengths": ["<concrete strength referencing specific experience>", ...],
  "recommendation": "<strong-fit|moderate-fit|weak-fit>",
  "summary": "<2-3 sentence verdict with strongest signal and biggest concern>",
  "autoGenerate": false
}

The "autoGenerate" field should always be false — the caller will set this based on the user's threshold preference.`,
          },
          {
            role: "user",
            content: `JOB DESCRIPTION (raw):
${jobDescription}

PARSED REQUIREMENTS:
Required Skills: ${parsedJd.required_skills.join(", ")}
Nice to Have: ${parsedJd.nice_to_have.join(", ")}
Responsibilities: ${parsedJd.responsibilities.join("; ")}
Keywords: ${parsedJd.keywords.join(", ")}
Company: ${parsedJd.companyName || "Unknown"}
Position: ${parsedJd.jobPosition || "Unknown"}
${parsedJd.seniorityLevel ? `Seniority Level: ${parsedJd.seniorityLevel}` : ""}
${parsedJd.roleArchetype ? `Role Archetype: ${parsedJd.roleArchetype}` : ""}

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

Perform the full evaluation: skill mapping, dimension scoring, gap analysis with mitigation strategies, and summary.`,
          },
        ],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(completion.choices[0].message.content || "{}");
      return ProfileEvaluationSchema.parse(result);
    } catch (error) {
      this.handleError(error, "evaluateProfileFit");
    }
  }
}
