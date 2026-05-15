import { GoogleGenerativeAI } from "@google/generative-ai";
import { Injectable, Logger } from "@nestjs/common";
import {
  EditPlan,
  EditPlanSchema,
  EvidenceCandidate,
  EvidenceRewriteResult,
  EvidenceRewriteResultSchema,
  NormalizedRequirement,
  ParsedJD,
  ParsedJDSchema,
  RewrittenBullet,
  SelectionResult,
  SelectionResultSchema,
  VerificationResult,
  VerificationResultSchema,
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
  private readonly verifierModel: string;

  constructor() {
    this.client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    this.parseModel = process.env.GEMINI_PARSE_MODEL || "gemini-2.5-flash";
    this.rewriteModel = process.env.GEMINI_REWRITE_MODEL || "gemini-2.5-flash";
    this.selectionModel =
      process.env.GEMINI_SELECTION_MODEL || "gemini-2.5-flash";
    this.verifierModel =
      process.env.GEMINI_VERIFIER_MODEL || this.rewriteModel;
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

      const prompt = `You are an expert career coach specializing in helping software engineers analyze job opportunities.

Your task is to extract and categorize job requirements with hiring manager precision:

1. **Essential Skills** (required_skills): Must-have technical and soft skills explicitly required
2. **Preferred Skills** (nice_to_have): Nice-to-have qualifications and bonus skills
3. **Core Responsibilities** (responsibilities): Key duties and day-to-day work
4. **Industry Keywords** (keywords): Domain terminology, tools, frameworks, and buzzwords
5. **Job Metadata**: Company name, position title, and team name if mentioned

Extract with precision - categorize skills accurately to help candidates understand what truly matters.

Parse this job description:

${jobDescription}

Return JSON with:
- required_skills (array)
- nice_to_have (array)
- responsibilities (array)
- keywords (array)
- companyName: the company name (string or null)
- jobPosition: the job title/position (string or null)
- teamName: the team name if mentioned (string or null)`;

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

      const prompt = `You are a professional career coach who helps software engineers optimize resume bullets for specific job opportunities.

Your task: Rework experience and project bullet points to align with the target job description while maintaining authenticity.

CORE PRINCIPLES:
- **No hallucination**: Never invent metrics, technologies, or experiences
- **Research-backed**: If numbers are missing but the work implies scale, reference realistic industry metrics
- **Experience-constrained**: Only work with provided content - no new claims
- **Technical focus**: Maintain professional, technical tone - avoid marketing fluff
- **Data-driven**: Emphasize quantifiable achievements when they exist

CRITICAL RULES:
- DO NOT add new metrics, numbers, or percentages not in the original unless you can verify realistic industry benchmarks
- DO NOT add new technologies not in the original bullet's skills/tags
- DO NOT make new claims about impact or responsibility
- ONLY rephrase and reorder existing information to emphasize relevance to the job
- ALWAYS start bullets in the same experience with DIFFERENT action verbs for variety
- ALWAYS keep the tone consise, clear, technical and focused on concrete achievements

Return JSON with:
- bulletId: the bullet ID
- rewrittenText: the optimized text (grounded in original)
- evidenceBulletIds: [bulletId] (always just the original bullet)
- riskFlags: array of any concerns (empty if none)

Original bullet: "${bullet.content}"
Skills/Tags: ${[...bullet.skills, ...bullet.tags].join(", ")}

Job requires: ${jd.required_skills.join(", ")}
Keywords: ${jd.keywords.join(", ")}

Rewrite to emphasize relevance while staying 100% grounded in the original content.`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      const parsed = JSON.parse(text);
      return {
        bulletId: bullet.id,
        rewrittenText: parsed.rewrittenText || bullet.content,
        evidenceBulletIds: [bullet.id],
        riskFlags: parsed.riskFlags || [],
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

      const prompt = `You are a professional career coach with hiring manager expertise, helping software engineers strategically select resume content for specific job opportunities.

Your task: Analyze the job requirements from a hiring manager's perspective and recommend which experiences from the master resume should be prioritized to maximize interview chances.

HIRING MANAGER PERSPECTIVE:
1. **Identify key strengths**: What would make an ideal candidate stand out?
2. **Recognize gaps**: What areas typically need attention for this role?
3. **Strategic selection**: Which experiences demonstrate the strongest fit?

SELECTION STRATEGY:
- From each experience, choose 2-5 bullets that directly align with essential and preferred skills
- Select 2-3 most relevant projects that showcase technical depth and impact
- Include all education entries but only coursework that's directly relevant
- Prioritize recent experiences and measurable achievements
- Focus on transferable skills and domain-specific expertise
- Consider both explicit skill matches and implicit competency signals
- Think: "What would make this candidate get invited for an interview?"

RELEVANCE REASONING:
- Explain selections as if advising the candidate on what stands out
- Highlight how each experience demonstrates fit for the role
- Focus on concrete value and technical credibility

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

  private async generateJson<T>(modelName: string, prompt: string): Promise<T> {
    const model = this.client.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });
    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text()) as T;
  }

  async rankEvidenceCandidates(
    candidates: EvidenceCandidate[],
    requirements: NormalizedRequirement[],
    parsedJd: ParsedJD,
    topK: number,
  ): Promise<SelectionResult[]> {
    try {
      const parsed = await this.generateJson<any>(
        this.selectionModel,
        `You are an evidence-first resume bullet ranker.
Use only the provided job requirements and candidate bullets.
Return JSON with a "selected" array. Each item must include bulletId, rank, relevanceScore, confidence, matchedRequirements, jobEvidence, profileEvidence, and riskFlags.

${JSON.stringify({
  topK,
  parsedJd,
  requirements,
  candidates: candidates.map((c) => ({
    bulletId: c.bulletId,
    content: c.content,
    parentType: c.parentType,
    parentTitle: c.parentTitle,
    parentCompany: c.parentCompany,
    skills: c.skills,
    tags: c.tags,
    claims: c.claims,
    retrievalScore: c.retrievalScore,
  })),
})}`,
      );
      return SelectionResultSchema.array()
        .parse(parsed.selected ?? parsed)
        .slice(0, topK);
    } catch (error) {
      this.handleError(error, "rankEvidenceCandidates");
    }
  }

  async createEditPlan(
    candidate: EvidenceCandidate,
    selection: SelectionResult,
    requirements: NormalizedRequirement[],
  ): Promise<EditPlan> {
    try {
      const parsed = await this.generateJson<any>(
        this.rewriteModel,
        `Create a constrained resume-bullet edit plan.
Return JSON with bulletId, preservedFacts, approvedTerms, forbiddenInferences, and rewriteIntent.
Preserved facts must come from the original bullet. Approved terms must come from matched requirements.

${JSON.stringify({ candidate, selection, requirements })}`,
      );
      return EditPlanSchema.parse({ bulletId: candidate.bulletId, ...parsed });
    } catch (error) {
      this.handleError(error, `createEditPlan (${candidate.bulletId})`);
    }
  }

  async rewriteFromEditPlan(
    candidate: EvidenceCandidate,
    editPlan: EditPlan,
    parsedJd: ParsedJD,
  ): Promise<EvidenceRewriteResult> {
    try {
      const parsed = await this.generateJson<any>(
        this.rewriteModel,
        `You are a factual, minimal-diff resume bullet editor.
Rewrite only from the original bullet and edit plan.
Do not add new metrics, tools, domains, ownership, seniority, or impact claims.
Return JSON with bulletId, rewriteText, preservedFacts, alignedTerms, forbiddenInferences, newInformationAdded, and riskFlags.

${JSON.stringify({
  originalBullet: candidate.content,
  skills: candidate.skills,
  tags: candidate.tags,
  editPlan,
  parsedJd,
})}`,
      );
      return EvidenceRewriteResultSchema.parse({
        bulletId: candidate.bulletId,
        ...parsed,
      });
    } catch (error) {
      this.handleError(error, `rewriteFromEditPlan (${candidate.bulletId})`);
    }
  }

  async verifyRewrite(
    candidate: EvidenceCandidate,
    rewrite: EvidenceRewriteResult,
    editPlan: EditPlan,
    parsedJd: ParsedJD,
  ): Promise<VerificationResult> {
    try {
      const parsed = await this.generateJson<any>(
        this.verifierModel,
        `You are a strict factual verifier for resume rewrites.
Check unsupported claims, dropped preserved facts, copied job phrasing, metric changes, and naturalness.
Return JSON with pass, unsupportedClaims, droppedFacts, copyRisk, naturalnessNotes, and fixInstructions.

${JSON.stringify({
  original: candidate.content,
  rewrite: rewrite.rewriteText,
  editPlan,
  parsedJd,
})}`,
      );
      return VerificationResultSchema.parse(parsed);
    } catch (error) {
      this.handleError(error, `verifyRewrite (${candidate.bulletId})`);
    }
  }
}
