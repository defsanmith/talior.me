import {
  EditableResume,
  ResumeBullet,
  ResumeCertification,
  ResumeCoursework,
  ResumeEducation,
  ResumeExperience,
  ResumeProject,
  ResumeSkillCategory,
  ResumeSkillItem,
  SectionOrder,
} from "@tailor.me/shared";

export type SectionType =
  | "education"
  | "experience"
  | "skills"
  | "projects"
  | "certifications";

export interface ResumeBuilderContextValue {
  resume: EditableResume;
  updateResume: (updates: Partial<EditableResume>) => void;
  isSaving: boolean;
  lastSaved: Date | null;
}

export interface DraggableItemProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

export interface SectionEditorProps<T> {
  title: string;
  sectionType: SectionType;
  items: T[];
  visible: boolean;
  onVisibilityChange: (visible: boolean) => void;
  onItemsReorder: (items: T[]) => void;
  renderItem: (item: T, index: number) => React.ReactNode;
  onAddItem: () => void;
  addButtonLabel: string;
}

export type {
  EditableResume,
  ResumeBullet,
  ResumeCertification,
  ResumeCoursework,
  ResumeEducation,
  ResumeExperience,
  ResumeProject,
  ResumeSkillCategory,
  ResumeSkillItem,
  SectionOrder,
};
