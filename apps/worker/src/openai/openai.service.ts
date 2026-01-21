import { Injectable } from "@nestjs/common";
import { ParsedJD, ParsedJDSchema, RewrittenBullet } from "@tailor.me/shared";
import OpenAI from "openai";

// Types for AI content selection
export interface ProfileExperience {
  id: string;
  company: string;
  title: string;
  location: string | null;
  startDate: string;
  endDate: string | null;
  bullets: Array<{
    id: string;
    content: string;
    skills: string[];
  }>;
}

export interface ProfileProject {
  id: string;
  name: string;
  date: string | null;
  url: string | null;
  skills: string[];
  bullets: Array<{
    id: string;
    content: string;
  }>;
}

export interface ProfileEducation {
  id: string;
  institution: string;
  degree: string;
  location: string | null;
  graduationDate: string | null;
  coursework: string[];
}

export interface ProfileSkillCategory {
  id: string;
  name: string;
  skills: Array<{
    id: string;
    name: string;
  }>;
}

export interface ProfileUser {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  website: string | null;
  linkedin: string | null;
}

export interface ProfileData {
  user: ProfileUser | null;
  experiences: ProfileExperience[];
  projects: ProfileProject[];
  education: ProfileEducation[];
  skillCategories: ProfileSkillCategory[];
}

export interface ContentSelection {
  experiences: Array<{
    id: string;
    bulletIds: string[];
    relevanceReason: string;
  }>;
  projects: Array<{
    id: string;
    bulletIds: string[];
    relevanceReason: string;
  }>;
  education: Array<{
    id: string;
    selectedCoursework: string[];
    relevanceReason: string;
  }>;
}

@Injectable()
export class OpenAIService {
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

  async parseJobDescription(jobDescription: string): Promise<ParsedJD> {
    const completion = await this.client.chat.completions.create({
      model: this.parseModel,
      messages: [
        {
          role: "system",
          content: `You are an expert career coach specializing in helping software engineers analyze job opportunities.

Your task is to extract and categorize job requirements with hiring manager precision:

1. **Essential Skills** (required_skills): Must-have technical and soft skills explicitly required
2. **Preferred Skills** (nice_to_have): Nice-to-have qualifications and bonus skills
3. **Core Responsibilities** (responsibilities): Key duties and day-to-day work
4. **Industry Keywords** (keywords): Domain terminology, tools, frameworks, and buzzwords
5. **Job Metadata**: Company name, position title, and team name if mentioned

Extract with precision - categorize skills accurately to help candidates understand what truly matters.
Return only valid JSON.`,
        },
        {
          role: "user",
          content: `Parse this job description:\n\n${jobDescription}\n\nReturn JSON with:\n- required_skills (array)\n- nice_to_have (array)\n- responsibilities (array)\n- keywords (array)\n- companyName: the company name (string or null)\n- jobPosition: the job title/position (string or null)\n- teamName: the team name if mentioned (string or null)`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");
    return ParsedJDSchema.parse(result);
  }

  async rewriteBullet(
    bullet: { id: string; content: string; tags: string[]; skills: string[] },
    jd: ParsedJD
  ): Promise<RewrittenBullet> {
    const completion = await this.client.chat.completions.create({
      model: this.rewriteModel,
      messages: [
        {
          role: "system",
          content: `You are a professional career coach who helps software engineers optimize resume bullets for specific job opportunities.

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
- riskFlags: array of any concerns (empty if none)`,
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
    return {
      bulletId: bullet.id,
      rewrittenText: result.rewrittenText || bullet.content,
      evidenceBulletIds: [bullet.id],
      riskFlags: result.riskFlags || [],
    };
  }

  /**
   * Uses AI to select the most relevant content from the user's profile
   * based on the job description.
   */
  async selectRelevantContent(
    profile: ProfileData,
    parsedJd: ParsedJD
  ): Promise<ContentSelection> {
    // Format profile data for the prompt
    const experiencesText = profile.experiences
      .map(
        (exp) =>
          `Experience [${exp.id}]: ${exp.title} at ${exp.company} (${exp.startDate} - ${exp.endDate || "Present"})
  Bullets:
${exp.bullets.map((b) => `    - [${b.id}] ${b.content} (Skills: ${b.skills.join(", ") || "none"})`).join("\n")}`
      )
      .join("\n\n");

    const projectsText = profile.projects
      .map(
        (proj) =>
          `Project [${proj.id}]: ${proj.name} (Skills: ${proj.skills.join(", ") || "none"})
  Bullets:
${proj.bullets.map((b) => `    - [${b.id}] ${b.content}`).join("\n")}`
      )
      .join("\n\n");

    const educationText = profile.education
      .map(
        (edu) =>
          `Education [${edu.id}]: ${edu.degree} at ${edu.institution} (${edu.graduationDate || "N/A"})
  Coursework: ${edu.coursework.join(", ") || "none"}`
      )
      .join("\n\n");

    const skillsText = profile.skillCategories
      .map(
        (cat) =>
          `Category [${cat.id}]: ${cat.name}
  Skills: ${cat.skills.map((s) => `[${s.id}] ${s.name}`).join(", ")}`
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
  }
}
