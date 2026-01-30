import { ParsedJD, RewrittenBullet } from "@tailor.me/shared";

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

/**
 * Interface for AI provider implementations
 * Supports OpenAI, Google Gemini, and other LLM providers
 */
export interface IAIProvider {
  /**
   * Parse job description to extract requirements and keywords
   */
  parseJobDescription(jobDescription: string): Promise<ParsedJD>;

  /**
   * Rewrite a resume bullet to align with job requirements
   */
  rewriteBullet(
    bullet: { id: string; content: string; tags: string[]; skills: string[] },
    jd: ParsedJD,
  ): Promise<RewrittenBullet>;

  /**
   * Select the most relevant content from user's profile for a specific job
   */
  selectRelevantContent(
    profile: ProfileData,
    parsedJd: ParsedJD,
  ): Promise<ContentSelection>;
}
