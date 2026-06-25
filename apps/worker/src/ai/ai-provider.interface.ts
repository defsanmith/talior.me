import {
  CustomizationPlan,
  ParsedJD,
  ProfileEvaluation,
  RewrittenBullet,
} from "@tailor.me/shared";

export type BulletInput = {
  id: string;
  content: string;
  tags: string[];
  skills: string[];
};

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

export interface ProfileCertification {
  id: string;
  title: string;
  issuer: string;
  issueDate: string | null;
  expirationDate: string | null;
  credentialUrl: string | null;
}

export interface ProfileUser {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  openToRelocate: boolean;
  website: string | null;
  linkedin: string | null;
}

export interface ProfileData {
  user: ProfileUser | null;
  experiences: ProfileExperience[];
  projects: ProfileProject[];
  education: ProfileEducation[];
  skillCategories: ProfileSkillCategory[];
  certifications: ProfileCertification[];
}

export interface ContentSelection {
  experiences: Array<{
    id: string;
    bulletIds: string[]; // ordered by JD relevance — most relevant bullet first
    relevanceScore: number; // 1–5, used for threshold filtering
    relevanceReason: string;
  }>;
  projects: Array<{
    id: string;
    bulletIds: string[]; // ordered by JD relevance — most relevant bullet first
    relevanceScore: number; // 1–5
    relevanceReason: string;
  }>;
  education: Array<{
    id: string;
    selectedCoursework: string[];
    relevanceReason: string;
  }>;
  skills?: Array<{
    categoryId: string;
    skillIds: string[]; // ordered by JD relevance — most relevant skill first
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
    bullet: BulletInput,
    jd: ParsedJD,
    plan?: CustomizationPlan,
  ): Promise<RewrittenBullet>;

  /**
   * Rewrite a group of bullets from the same parent (experience or project)
   * in a single call so the model can enforce verb diversity across the set.
   */
  rewriteBulletsBatch(
    bullets: BulletInput[],
    jd: ParsedJD,
    plan?: CustomizationPlan,
  ): Promise<RewrittenBullet[]>;

  /**
   * Select the most relevant content from user's profile for a specific job
   */
  selectRelevantContent(
    profile: ProfileData,
    parsedJd: ParsedJD,
    plan?: CustomizationPlan,
  ): Promise<ContentSelection>;

  /**
   * Evaluate how well the user's profile fits a specific job description.
   * Returns a multi-dimensional scoring with gap analysis.
   */
  evaluateProfileFit(
    profile: ProfileData,
    parsedJd: ParsedJD,
    jobDescription: string,
  ): Promise<ProfileEvaluation>;

  /**
   * Generate a customization plan for tailoring the resume.
   * Called after evaluation; the plan guides content selection and bullet rewriting.
   */
  generateCustomizationPlan(
    profile: ProfileData,
    parsedJd: ParsedJD,
    evaluation: ProfileEvaluation,
  ): Promise<CustomizationPlan>;
}
