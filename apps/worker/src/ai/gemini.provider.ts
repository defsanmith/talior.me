import { GoogleGenerativeAI, Schema, SchemaType } from "@google/generative-ai";
import { Injectable, Logger } from "@nestjs/common";
import {
  ContentSelectionSchema,
  ParsedJD,
  ParsedJDSchema,
  ProfileEvaluation,
  ProfileEvaluationSchema,
  RewrittenBullet,
  RewrittenBulletSchema,
} from "@tailor.me/shared";
import {
  ContentSelection,
  IAIProvider,
  ProfileData,
} from "./ai-provider.interface";

// ── Gemini response schemas ──────────────────────────────────────────────────
// Gemini uses its own Schema format (not JSON Schema) — define explicitly.

const parsedJdGeminiSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    required_skills: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    nice_to_have:    { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    responsibilities:{ type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    keywords:        { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    companyName:     { type: SchemaType.STRING, nullable: true },
    jobPosition:     { type: SchemaType.STRING, nullable: true },
    teamName:        { type: SchemaType.STRING, nullable: true },
    seniorityLevel:  {
      type: SchemaType.STRING,
      enum: ["intern","junior","mid","senior","staff","principal","director","vp","unknown"],
      nullable: true,
    },
    remotePolicy: {
      type: SchemaType.STRING,
      enum: ["remote","hybrid","onsite","unknown"],
      nullable: true,
    },
    roleArchetype: {
      type: SchemaType.STRING,
      enum: ["backend","frontend","fullstack","devops","data","ml","mobile","security","management","other"],
      nullable: true,
    },
  },
  required: ["required_skills","nice_to_have","responsibilities","keywords"],
};

const rewrittenBulletGeminiSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    bulletId:          { type: SchemaType.STRING },
    rewrittenText:     { type: SchemaType.STRING },
    evidenceBulletIds: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    riskFlags:         { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
  },
  required: ["bulletId","rewrittenText","evidenceBulletIds","riskFlags"],
};

const contentSelectionGeminiSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    experiences: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          id:             { type: SchemaType.STRING },
          relevanceScore: { type: SchemaType.NUMBER },
          bulletIds:      { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          relevanceReason:{ type: SchemaType.STRING },
        },
        required: ["id","relevanceScore","bulletIds","relevanceReason"],
      },
    },
    projects: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          id:             { type: SchemaType.STRING },
          relevanceScore: { type: SchemaType.NUMBER },
          bulletIds:      { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          relevanceReason:{ type: SchemaType.STRING },
        },
        required: ["id","relevanceScore","bulletIds","relevanceReason"],
      },
    },
    education: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          id:                 { type: SchemaType.STRING },
          selectedCoursework: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          relevanceReason:    { type: SchemaType.STRING },
        },
        required: ["id","selectedCoursework","relevanceReason"],
      },
    },
  },
  required: ["experiences","projects","education"],
};

const profileEvaluationGeminiSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    overallScore: { type: SchemaType.NUMBER },
    dimensions: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name:      { type: SchemaType.STRING },
          score:     { type: SchemaType.NUMBER },
          weight:    { type: SchemaType.NUMBER },
          reasoning: { type: SchemaType.STRING },
        },
        required: ["name","score","weight","reasoning"],
      },
    },
    gaps: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          requirement:          { type: SchemaType.STRING },
          severity:             { type: SchemaType.STRING, enum: ["hard-blocker","moderate","nice-to-have"] },
          detail:               { type: SchemaType.STRING },
          mitigationSuggestion: { type: SchemaType.STRING, nullable: true },
        },
        required: ["requirement","severity","detail"],
      },
    },
    recommendation: {
      type: SchemaType.STRING,
      enum: ["strong-fit","moderate-fit","weak-fit"],
    },
    summary:      { type: SchemaType.STRING },
    autoGenerate: { type: SchemaType.BOOLEAN },
    strengths:    { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
  },
  required: ["overallScore","dimensions","gaps","recommendation","summary","autoGenerate","strengths"],
};

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
          responseSchema: parsedJdGeminiSchema,
        },
      });

      const prompt = `You are a senior technical recruiter parsing a job description into a structured format for a resume optimization system.

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

Parse this job description:

${jobDescription}

Return only valid JSON.`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();

      const raw = JSON.parse(text);
      return ParsedJDSchema.parse(raw);
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
          responseSchema: rewrittenBulletGeminiSchema,
        },
      });

      const prompt = `You are a professional career coach who helps software engineers rewrite resume bullets to better match a specific job description. You use ethical keyword injection: weaving JD vocabulary into existing experience without inventing anything.

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

SYNTHESIS:
The skills/tags attached to a bullet represent the full context of what the candidate did in that role — use them to write a richer, more specific statement than the original. For example:
- Original: "Worked on backend services" + Skills: [Python, PostgreSQL, Redis] → "Built Python backend services with PostgreSQL and Redis for session management"
- Original: "Improved build times" + Skills: [Docker, CI/CD, GitHub Actions] → "Cut CI pipeline build times by containerizing with Docker and parallelizing GitHub Actions workflows"
Synthesize the bullet content and its skills/tags into the most complete, honest statement possible.

STYLE RULES:
- Structure: Action Verb + What + How/With What + Impact/Context
- Aim for 20–35 words — long enough to be specific, short enough to scan in under 3 seconds
- Start with a past-tense action verb
- No trailing period
- Front-load the most JD-relevant content
- Prefer one well-rounded sentence over two choppy fragments

SELF-VERIFICATION (do this before returning):
1. Does the rewritten bullet contain any technology, metric, or claim NOT present in the original or its skills/tags? If yes, remove it.
2. Did you use any banned word? If yes, replace it.
3. Is the bullet specific enough that a reader understands what the candidate actually did? If it reads like a job description ("Responsible for..."), rewrite it.

Return JSON with:
- bulletId: the bullet ID
- rewrittenText: the rewritten bullet
- evidenceBulletIds: [bulletId] (always just the original bullet)
- riskFlags: array of any concerns (empty array if none). Flag "keyword_injected" if you mapped JD terminology onto existing content.

Original bullet: "${bullet.content}"
Skills/Tags: ${[...bullet.skills, ...bullet.tags].join(", ")}

JD required skills: ${jd.required_skills.join(", ")}
JD keywords: ${jd.keywords.join(", ")}

Synthesize the bullet and its skills/tags into the most specific, well-rounded statement that naturally highlights relevance to this role.`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();

      const raw = JSON.parse(text);
      const validated = RewrittenBulletSchema.parse(raw);
      const rewrittenText = validated.rewrittenText?.trim();
      const riskFlags: string[] = [...(validated.riskFlags || [])];
      if (!rewrittenText || rewrittenText === bullet.content.trim()) {
        this.logger.warn(`Bullet ${bullet.id} was not rewritten by model`);
        riskFlags.push("no_rewrite");
      }
      return {
        bulletId: bullet.id,
        rewrittenText: rewrittenText || bullet.content,
        evidenceBulletIds: validated.evidenceBulletIds,
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
          responseSchema: contentSelectionGeminiSchema,
        },
      });

      const allBulletIds = [
        ...profile.experiences.flatMap((e) => e.bullets.map((b) => b.id)),
        ...profile.projects.flatMap((p) => p.bullets.map((b) => b.id)),
      ];

      const prompt = `You are a professional career coach with deep hiring manager expertise. Your job is to curate a candidate's master resume into the strongest possible targeted resume for a specific role.

STEP 1 — KEYWORD EXTRACTION:
Before evaluating anything, identify the 10–15 highest-signal keywords from the job requirements: required technologies, domain terms, key responsibilities, and methodology terms. These are what the hiring manager's eye will catch on a quick scan.

STEP 2 — SCORE EVERY EXPERIENCE AND PROJECT (1–5):
Score each item against those keywords and the role's core responsibilities:
  5 = Direct match — candidate did this exact thing at similar scale
  4 = Strong match — directly adjacent, clear transferable signal
  3 = Moderate match — some relevant overlap, worth including
  2 = Weak match — tangentially related, borderline
  1 = Not relevant — different domain, skill set, or seniority level

${parsedJd.roleArchetype ? `ARCHETYPE WEIGHTING (role is "${parsedJd.roleArchetype}"):
Weight experiences heavily that involve the core skills and problem space of this archetype. Deprioritize experiences from a clearly different archetype even if they're recent.` : ""}

STEP 3 — SELECTION BY THRESHOLD (not by count):
- Include ALL experiences and projects scoring 3 or higher
- If more than 5 score 3+, keep the top 5 by score (break ties by recency)
- If fewer than 2 score 3+, fall back to the top 2 by score regardless
- Never include an item scoring 1–2 — it hurts more than it helps
- Include ALL education entries (they're short and harmless)
- If the JD is short or generic, lower the bar slightly and weight recency more

STEP 4 — BULLET SELECTION AND ORDERING (critical):
For each selected experience or project:
- Score each bullet individually against the job's top keywords
- Include bullets scoring 3+ (typically 3–5 bullets; never fewer than 2 unless the experience has fewer)
- Return bulletIds in ORDER OF RELEVANCE — most relevant bullet first
- The resume displays bullets in exactly the order you return them — put the strongest signal bullet at the top

STEP 5 — EXPERIENCE ORDERING:
Return all arrays in ORDER OF RELEVANCE — highest-scoring experience first. This controls the resume's section order. The item the hiring manager should see first goes first.

NARRATIVE COHERENCE:
The selected items should tell a consistent story toward this role. If two experiences both score 4 but one contradicts the narrative (e.g., a pure management role when the JD is deeply technical), prefer the one that fits the trajectory. Note any trade-off in relevanceReason.

CRITICAL ID RULES:
- Only use IDs that appear in the VALID IDs section
- selectedCoursework must be exact strings from the candidate's "Coursework" list
- Before returning, verify every ID in your response exists in the valid lists

Return a JSON object with this exact structure:
{
  "experiences": [
    {
      "id": "experience_id",
      "relevanceScore": <1-5>,
      "bulletIds": ["most_relevant_bullet_id", "second_bullet_id", ...],
      "relevanceReason": "1-2 sentences on why this makes the hiring manager want to interview this candidate"
    }
  ],
  "projects": [
    {
      "id": "project_id",
      "relevanceScore": <1-5>,
      "bulletIds": ["most_relevant_bullet_id", ...],
      "relevanceReason": "How this project demonstrates signal for this specific role"
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

VALID IDs — only use IDs from these exact lists:
Valid experience IDs: ${profile.experiences.map((e) => e.id).join(", ") || "none"}
Valid project IDs: ${profile.projects.map((p) => p.id).join(", ") || "none"}
Valid education IDs: ${profile.education.map((e) => e.id).join(", ") || "none"}
Valid bullet IDs: ${allBulletIds.join(", ") || "none"}

Score every experience and project, then select and order by relevance threshold.`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();

      const raw = JSON.parse(text);
      return ContentSelectionSchema.parse(raw);
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
          responseSchema: profileEvaluationGeminiSchema,
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

      const prompt = `You are a senior technical recruiter performing a rigorous, multi-step fit assessment between a candidate's profile and a job description. Think like a hiring manager reviewing the top of a 200-applicant funnel.

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

The "autoGenerate" field should always be false — the caller will set this based on the user's threshold preference.

JOB DESCRIPTION (raw):
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

Perform the full evaluation: skill mapping, dimension scoring, gap analysis with mitigation strategies, and summary.`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();

      const raw = JSON.parse(text);
      return ProfileEvaluationSchema.parse(raw);
    } catch (error) {
      this.handleError(error, "evaluateProfileFit");
    }
  }
}
