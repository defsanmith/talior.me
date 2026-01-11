"use client";

import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { DraggableItem } from "@/components/resume-builder/draggable-item";
import { EducationSection } from "@/components/resume-builder/education-section";
import { ExperienceSection } from "@/components/resume-builder/experience-section";
import { ProjectsSection } from "@/components/resume-builder/projects-section";
import { ResumePreview } from "@/components/resume-builder/resume-preview";
import { SkillsSection } from "@/components/resume-builder/skills-section";
import {
  EditableResume,
  ResumeEducation,
  ResumeExperience,
  ResumeProject,
  ResumeSkillCategory,
  SectionOrder,
} from "@/components/resume-builder/types";
import {
  useGetJobByIdQuery,
  useUpdateJobResumeMutation,
} from "@/store/api/jobs/queries";

// Default empty resume structure
const defaultResume: EditableResume = {
  summary: "",
  sectionOrder: [
    { id: "education", type: "education", visible: true, order: 0 },
    { id: "experience", type: "experience", visible: true, order: 1 },
    { id: "skills", type: "skills", visible: true, order: 2 },
    { id: "projects", type: "projects", visible: true, order: 3 },
  ],
  education: [],
  experiences: [],
  skillCategories: [],
  projects: [],
};

// Helper to convert old resume format to new editable format
function migrateResume(oldResume: any): EditableResume {
  if (!oldResume) return defaultResume;

  // Check if already in new format
  if (oldResume.sectionOrder) {
    return oldResume as EditableResume;
  }

  // Migrate from old format
  const generateId = (prefix: string, index: number) =>
    `${prefix}-${Date.now()}-${index}`;

  const education: ResumeEducation[] = (oldResume.education || []).map(
    (edu: any, i: number) => ({
      id: generateId("edu", i),
      institution: edu.institution || "",
      degree: edu.degree || "",
      graduationDate: edu.graduationDate || null,
      coursework: [],
      visible: true,
      order: i,
    }),
  );

  const experiences: ResumeExperience[] = (oldResume.experiences || []).map(
    (exp: any, i: number) => ({
      id: generateId("exp", i),
      company: exp.company || "",
      title: exp.title || "",
      startDate: exp.startDate || "",
      endDate: exp.endDate || null,
      bullets: (exp.bullets || []).map((text: string, j: number) => ({
        id: generateId("bullet", j),
        text,
        visible: true,
        order: j,
      })),
      visible: true,
      order: i,
    }),
  );

  // Group skills by detecting categories or create a default "Skills" category
  const skillCategories: ResumeSkillCategory[] =
    oldResume.skills && oldResume.skills.length > 0
      ? [
          {
            id: generateId("cat", 0),
            name: "Technical Skills",
            skills: oldResume.skills.map((skill: string, i: number) => ({
              id: generateId("skill", i),
              name: skill,
              visible: true,
            })),
            visible: true,
            order: 0,
          },
        ]
      : [];

  const projects: ResumeProject[] = (oldResume.projects || []).map(
    (proj: any, i: number) => ({
      id: generateId("proj", i),
      name: proj.name || "",
      description: proj.description || "",
      tech: proj.tech || [],
      bullets: (proj.bullets || []).map((text: string, j: number) => ({
        id: generateId("bullet", j),
        text,
        visible: true,
        order: j,
      })),
      visible: true,
      order: i,
    }),
  );

  return {
    summary: oldResume.summary || "",
    sectionOrder: defaultResume.sectionOrder,
    education,
    experiences,
    skillCategories,
    projects,
  };
}

export default function JobDetailPage() {
  const params = useParams();
  const jobId = params?.jobId as string;

  const { data: response, isLoading, error } = useGetJobByIdQuery(jobId);

  // Wait for data to load, then render the editor
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-2 text-zinc-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading resume...</span>
        </div>
      </div>
    );
  }

  if (error || !response?.data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-2 text-red-400">
          <AlertCircle className="h-5 w-5" />
          <span>Job not found</span>
        </div>
      </div>
    );
  }

  // Render the editor with initial data
  const initialResume = migrateResume(response.data.result);
  return <ResumeBuilderEditor jobId={jobId} initialResume={initialResume} />;
}

interface ResumeBuilderEditorProps {
  jobId: string;
  initialResume: EditableResume;
}

function ResumeBuilderEditor({
  jobId,
  initialResume,
}: ResumeBuilderEditorProps) {
  const [updateResume, { isLoading: isSaving }] = useUpdateJobResumeMutation();

  // Local state for the resume - initialized with the data from API
  const [resume, setResume] = useState<EditableResume>(initialResume);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Auto-save with debounce
  const saveResume = useCallback(
    async (resumeToSave: EditableResume) => {
      try {
        setSaveStatus("saving");
        await updateResume({ jobId, resume: resumeToSave }).unwrap();
        setSaveStatus("saved");
        setHasUnsavedChanges(false);
        // Reset to idle after 2 seconds
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch (err) {
        console.error("Failed to save resume:", err);
        setSaveStatus("error");
      }
    },
    [jobId, updateResume],
  );

  // Debounced save effect
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const timeoutId = setTimeout(() => {
      saveResume(resume);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [resume, hasUnsavedChanges, saveResume]);

  // Update resume helper
  const handleResumeUpdate = useCallback((updates: Partial<EditableResume>) => {
    setResume((prev: EditableResume) => ({ ...prev, ...updates }));
    setHasUnsavedChanges(true);
  }, []);

  // Section visibility helpers
  const getSectionVisibility = (type: string): boolean => {
    const section = resume.sectionOrder.find(
      (s: SectionOrder) => s.type === type,
    );
    return section?.visible ?? true;
  };

  const setSectionVisibility = (type: string, visible: boolean): void => {
    handleResumeUpdate({
      sectionOrder: resume.sectionOrder.map((s: SectionOrder) =>
        s.type === type ? { ...s, visible } : s,
      ),
    });
  };

  // Section reordering
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleSectionDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = resume.sectionOrder.findIndex(
        (s: SectionOrder) => s.id === active.id,
      );
      const newIndex = resume.sectionOrder.findIndex(
        (s: SectionOrder) => s.id === over.id,
      );
      const reordered = arrayMove(resume.sectionOrder, oldIndex, newIndex).map(
        (s: SectionOrder, i: number): SectionOrder => ({ ...s, order: i }),
      );
      handleResumeUpdate({ sectionOrder: reordered });
    }
  };

  // Sorted sections for rendering
  const sortedSections = useMemo(
    () => [...resume.sectionOrder].sort((a, b) => a.order - b.order),
    [resume.sectionOrder],
  );

  // Render section based on type
  const renderSection = (section: SectionOrder) => {
    switch (section.type) {
      case "education":
        return (
          <DraggableItem key={section.id} id={section.id}>
            <EducationSection
              items={resume.education}
              sectionVisible={getSectionVisibility("education")}
              onSectionVisibilityChange={(v) =>
                setSectionVisibility("education", v)
              }
              onItemsChange={(items) =>
                handleResumeUpdate({ education: items })
              }
            />
          </DraggableItem>
        );
      case "experience":
        return (
          <DraggableItem key={section.id} id={section.id}>
            <ExperienceSection
              items={resume.experiences}
              sectionVisible={getSectionVisibility("experience")}
              onSectionVisibilityChange={(v) =>
                setSectionVisibility("experience", v)
              }
              onItemsChange={(items) =>
                handleResumeUpdate({ experiences: items })
              }
            />
          </DraggableItem>
        );
      case "skills":
        return (
          <DraggableItem key={section.id} id={section.id}>
            <SkillsSection
              items={resume.skillCategories}
              sectionVisible={getSectionVisibility("skills")}
              onSectionVisibilityChange={(v) =>
                setSectionVisibility("skills", v)
              }
              onItemsChange={(items) =>
                handleResumeUpdate({ skillCategories: items })
              }
            />
          </DraggableItem>
        );
      case "projects":
        return (
          <DraggableItem key={section.id} id={section.id}>
            <ProjectsSection
              items={resume.projects}
              sectionVisible={getSectionVisibility("projects")}
              onSectionVisibilityChange={(v) =>
                setSectionVisibility("projects", v)
              }
              onItemsChange={(items) => handleResumeUpdate({ projects: items })}
            />
          </DraggableItem>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      {/* Header with save status */}
      <div>
        <div className="flex items-center justify-between px-6 py-3">
          <h1 className="text-xl font-semibold">Resume Builder</h1>
          <div className="flex items-center gap-2">
            <SaveStatus status={saveStatus} isSaving={isSaving} />
          </div>
        </div>
      </div>

      {/* Main content - two column layout */}
      <div className="flex h-[calc(100vh-57px)]">
        {/* Left Panel - Editor */}
        <div className="w-1/2 overflow-y-auto p-6">
          <div className="mb-4">
            <p className="text-sm">
              Drag sections to reorder. Click the eye icon to show/hide content.
              All changes auto-save.
            </p>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleSectionDragEnd}
          >
            <SortableContext
              items={sortedSections.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {sortedSections.map((section) => renderSection(section))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* Right Panel - Preview */}
        <div className="w-1/2 overflow-y-auto p-6">
          <div className="mb-4">
            <h2 className="text-sm font-medium">Live Preview</h2>
          </div>
          <ResumePreview resume={resume} />
        </div>
      </div>
    </div>
  );
}

interface SaveStatusProps {
  status: "idle" | "saving" | "saved" | "error";
  isSaving: boolean;
}

function SaveStatus({ status, isSaving }: SaveStatusProps) {
  if (isSaving || status === "saving") {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Saving...</span>
      </div>
    );
  }

  if (status === "saved") {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-400">
        <Check className="h-4 w-4" />
        <span>Saved</span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex items-center gap-2 text-sm text-red-400">
        <AlertCircle className="h-4 w-4" />
        <span>Save failed</span>
      </div>
    );
  }

  return null;
}
