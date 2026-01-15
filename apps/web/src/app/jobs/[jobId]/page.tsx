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
import { AlertCircle, Check, Download, Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { InlineCompanyCombobox } from "@/components/job-tracker/inline-company-combobox";
import { InlinePositionCombobox } from "@/components/job-tracker/inline-position-combobox";
import { InlineTeamCombobox } from "@/components/job-tracker/inline-team-combobox";
import { DraggableItem } from "@/components/resume-builder/draggable-item";
import { EducationSection } from "@/components/resume-builder/education-section";
import { ExperienceSection } from "@/components/resume-builder/experience-section";
import { PdfPreview } from "@/components/resume-builder/pdf-preview";
import { ProjectsSection } from "@/components/resume-builder/projects-section";
import { SkillsSection } from "@/components/resume-builder/skills-section";
import {
  EditableResume,
  ResumeEducation,
  ResumeExperience,
  ResumeProject,
  ResumeSkillCategory,
  SectionOrder,
} from "@/components/resume-builder/types";
import { Button } from "@/components/ui/button";
import { Config } from "@/lib/config";
import {
  useGetJobByIdQuery,
  useUpdateJobResumeMutation,
} from "@/store/api/jobs/queries";
import { useUpdateJobDetailsMutation } from "@/store/api/tracker/mutations";
import { JobResponse } from "@tailor.me/shared";

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
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-2 text-zinc-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading resume...</span>
        </div>
      </div>
    );
  }

  if (error || !response?.data) {
    return (
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-2 text-red-400">
          <AlertCircle className="h-5 w-5" />
          <span>Job not found</span>
        </div>
      </div>
    );
  }

  // Render the editor with initial data
  const initialResume = migrateResume(response.data.result);
  return (
    <ResumeBuilderEditor
      jobId={jobId}
      initialResume={initialResume}
      job={response.data.job}
    />
  );
}

interface ResumeBuilderEditorProps {
  jobId: string;
  initialResume: EditableResume;
  job: JobResponse;
}

function ResumeBuilderEditor({
  jobId,
  initialResume,
  job,
}: ResumeBuilderEditorProps) {
  const [updateResume, { isLoading: isSaving }] = useUpdateJobResumeMutation();
  const [updateJobDetails] = useUpdateJobDetailsMutation();

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

  // Metadata update handlers
  const handleCompanyChange = async (companyId: string | undefined) => {
    try {
      await updateJobDetails({
        id: jobId,
        data: { companyId: companyId || null },
      }).unwrap();
    } catch (err) {
      console.error("Failed to update company:", err);
    }
  };

  const handlePositionChange = async (positionId: string | undefined) => {
    try {
      await updateJobDetails({
        id: jobId,
        data: { positionId: positionId || null },
      }).unwrap();
    } catch (err) {
      console.error("Failed to update position:", err);
    }
  };

  const handleTeamChange = async (teamId: string | undefined) => {
    try {
      await updateJobDetails({
        id: jobId,
        data: { teamId: teamId || null },
      }).unwrap();
    } catch (err) {
      console.error("Failed to update team:", err);
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

  const handleDownload = async () => {
    // Copy company name and team name to clipboard
    if (job?.company?.name || job?.position?.title || job?.team?.name) {
      const clipboardText = `${job.company?.name || ""}${
        job.position?.title ? ` - ${job.position.title}` : ""
      }${job.team?.name ? ` (${job.team.name})` : ""}`;

      try {
        await navigator.clipboard.writeText(clipboardText);
      } catch (err) {
        console.error("Failed to copy to clipboard:", err);
      }
    }

    // Open PDF in new tab
    window.open(
      `${Config.API_BASE_URL}/jobs/${jobId}/resume/pdf?download=true`,
      "_blank",
    );
  };

  return (
    <div>
      {/* Header with save status */}
      <div>
        <div className="flex items-center justify-between py-4 pr-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <InlineCompanyCombobox
                value={job?.companyId || undefined}
                onChange={handleCompanyChange}
                placeholder="Company Name"
                className="text-2xl font-bold"
              />
              <span className="text-2xl font-bold text-muted-foreground/50">
                -
              </span>
              <InlineTeamCombobox
                value={job?.teamId || undefined}
                onChange={handleTeamChange}
                placeholder="Team Name"
                className="text-2xl font-bold"
              />
            </div>
            <div className="mt-1">
              <InlinePositionCombobox
                value={job?.positionId || undefined}
                onChange={handlePositionChange}
                placeholder="Job Title"
                className="text-lg text-muted-foreground"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <SaveStatus status={saveStatus} isSaving={isSaving} />
            <Button
              onClick={handleDownload}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Main content - two column layout */}
      <div className="flex h-[calc(100vh-156px)]">
        {/* Left Panel - Editor */}
        <div className="w-1/2 overflow-y-auto p-4 pl-0">
          {/* Job Description Info */}
          {job?.parsedJd && (
            <div className="mb-6 rounded-lg border bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold">Job Details</h3>
              <div className="space-y-3 text-sm">
                {job.parsedJd?.required_skills &&
                  job.parsedJd.required_skills.length > 0 && (
                    <div>
                      <div className="mb-1 text-muted-foreground">
                        Required Skills:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {job.parsedJd.required_skills.map((skill, idx) => (
                          <span
                            key={idx}
                            className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                {job.parsedJd?.nice_to_have &&
                  job.parsedJd.nice_to_have.length > 0 && (
                    <div>
                      <div className="mb-1 text-muted-foreground">
                        Nice to Have:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {job.parsedJd.nice_to_have.map((skill, idx) => (
                          <span
                            key={idx}
                            className="rounded-md bg-muted px-2 py-0.5 text-xs"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                {job.parsedJd?.keywords && job.parsedJd.keywords.length > 0 && (
                  <div>
                    <div className="mb-1 text-muted-foreground">Keywords:</div>
                    <div className="flex flex-wrap gap-1">
                      {job.parsedJd.keywords.map((keyword, idx) => (
                        <span
                          key={idx}
                          className="rounded-md bg-accent px-2 py-0.5 text-xs"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {job.parsedJd?.responsibilities &&
                  job.parsedJd.responsibilities.length > 0 && (
                    <div>
                      <div className="mb-1 text-muted-foreground">
                        Key Responsibilities:
                      </div>
                      <ul className="ml-4 list-disc space-y-0.5 text-xs">
                        {job.parsedJd.responsibilities.map((resp, idx) => (
                          <li key={idx}>{resp}</li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
            </div>
          )}

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

        {/* Right Panel - PDF Preview */}
        <div className="w-1/2 overflow-y-auto p-4 pr-0">
          <div className="mb-4">
            <h2 className="text-sm font-medium">Live PDF Preview</h2>
          </div>
          <PdfPreview jobId={jobId} resume={resume} />
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
