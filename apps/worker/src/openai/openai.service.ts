import { Injectable } from "@nestjs/common";
import { ParsedJD, ParsedJDSchema, RewrittenBullet } from "@tailor.me/shared";
import OpenAI from "openai";

// Types for AI content selection
export interface ProfileExperience {
  id: string;
  company: string;
  title: string;
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

export interface ProfileData {
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
  skills: Array<{
    categoryId: string;
    skillIds: string[];
  }>;
}

@Injectable()
export class OpenAIService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async parseJobDescription(jobDescription: string): Promise<ParsedJD> {
    const completion = await this.client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a job description parser. Extract required skills, nice-to-have skills, responsibilities, and keywords from the job description. Return only valid JSON.",
        },
        {
          role: "user",
          content: `Parse this job description:\n\n${jobDescription}\n\nReturn JSON with: required_skills (array), nice_to_have (array), responsibilities (array), keywords (array)`,
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
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a resume bullet rewriter. Rewrite bullets to match the job description but ONLY rephrase existing content. 
          
CRITICAL RULES:
- DO NOT add new metrics, numbers, or percentages not in the original
- DO NOT add new technologies not in the original bullet's skills/tags
- DO NOT add scope words like "led", "owned", "architected" unless already present
- DO NOT make new claims about impact or responsibility
- ONLY rephrase and reorder existing information to emphasize relevance

Return JSON with:
- bulletId: the bullet ID
- rewrittenText: the rewritten text (grounded in original)
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
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert resume curator. Your job is to select the most relevant experiences, projects, education, and skills from a candidate's profile that best match a job description.

SELECTION GUIDELINES:
- Select 2-4 most relevant experiences with 3-5 bullets each
- Select 1-3 most relevant projects with their bullets
- Select all education entries but only include coursework relevant to the job
- Select skills that match the job requirements, organized by category
- Prioritize recent and impactful experiences
- Focus on transferable skills and achievements
- Consider both explicit skill matches and implicit relevance

Return a JSON object with this exact structure:
{
  "experiences": [
    {
      "id": "experience_id",
      "bulletIds": ["bullet_id1", "bullet_id2", ...],
      "relevanceReason": "Brief explanation of why this experience is relevant"
    }
  ],
  "projects": [
    {
      "id": "project_id",
      "bulletIds": ["bullet_id1", ...],
      "relevanceReason": "Brief explanation of why this project is relevant"
    }
  ],
  "education": [
    {
      "id": "education_id",
      "selectedCoursework": ["Course 1", "Course 2"],
      "relevanceReason": "Brief explanation"
    }
  ],
  "skills": [
    {
      "categoryId": "category_id",
      "skillIds": ["skill_id1", "skill_id2", ...]
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
      skills: result.skills || [],
    };
  }
}
