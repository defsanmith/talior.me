import { GoogleGenerativeAI } from "@google/generative-ai";
import { Injectable, Logger } from "@nestjs/common";
import { ParsedJD, ParsedJDSchema, RewrittenBullet } from "@tailor.me/shared";
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

  constructor() {
    this.client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    this.parseModel = process.env.GEMINI_PARSE_MODEL || "gemini-2.5-flash";
    this.rewriteModel = process.env.GEMINI_REWRITE_MODEL || "gemini-2.5-flash";
    this.selectionModel =
      process.env.GEMINI_SELECTION_MODEL || "gemini-2.5-flash";
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
}
