"use client";

import {
  EditableResume,
  ResumeEducation,
  ResumeExperience,
  ResumeProject,
  ResumeSkillCategory,
} from "./types";
import { cn } from "@/lib/utils";

interface ResumePreviewProps {
  resume: EditableResume;
  className?: string;
}

export function ResumePreview({ resume, className }: ResumePreviewProps) {
  // Get visible sections sorted by order
  const visibleSections = resume.sectionOrder
    .filter((s) => s.visible)
    .sort((a, b) => a.order - b.order);

  const renderSection = (sectionType: string) => {
    switch (sectionType) {
      case "education":
        return <EducationPreview key="education" items={resume.education} />;
      case "experience":
        return <ExperiencePreview key="experience" items={resume.experiences} />;
      case "skills":
        return <SkillsPreview key="skills" items={resume.skillCategories} />;
      case "projects":
        return <ProjectsPreview key="projects" items={resume.projects} />;
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        "mx-auto max-w-2xl rounded-lg bg-white p-8 text-gray-900 shadow-xl",
        className
      )}
      style={{
        fontFamily: "'Times New Roman', Times, serif",
        fontSize: "11pt",
        lineHeight: 1.4,
      }}
    >
      {/* Header */}
      <div className="mb-6 border-b-2 border-gray-900 pb-4 text-center">
        <h1
          className="mb-1 text-2xl font-bold uppercase tracking-wide"
          style={{ fontFamily: "'Georgia', serif" }}
        >
          Your Name
        </h1>
        <p className="text-sm text-gray-600">
          email@example.com | (555) 123-4567 | City, State | linkedin.com/in/yourprofile
        </p>
      </div>

      {/* Summary */}
      {resume.summary && (
        <div className="mb-4">
          <p className="text-sm italic text-gray-700">{resume.summary}</p>
        </div>
      )}

      {/* Dynamic Sections */}
      <div className="space-y-5">
        {visibleSections.map((section) => renderSection(section.type))}
      </div>
    </div>
  );
}

interface EducationPreviewProps {
  items: ResumeEducation[];
}

function EducationPreview({ items }: EducationPreviewProps) {
  const visibleItems = items
    .filter((item) => item.visible)
    .sort((a, b) => a.order - b.order);

  if (visibleItems.length === 0) return null;

  return (
    <section>
      <h2 className="mb-2 border-b border-gray-400 pb-1 text-sm font-bold uppercase tracking-wider">
        Education
      </h2>
      <div className="space-y-3">
        {visibleItems.map((item) => {
          const visibleCoursework = item.coursework.filter((c) => c.visible);
          return (
            <div key={item.id}>
              <div className="flex justify-between">
                <div>
                  <span className="font-semibold">{item.degree || "Degree"}</span>
                  {item.institution && (
                    <span className="text-gray-700"> - {item.institution}</span>
                  )}
                </div>
                {item.graduationDate && (
                  <span className="text-sm text-gray-600">
                    {item.graduationDate}
                  </span>
                )}
              </div>
              {visibleCoursework.length > 0 && (
                <p className="mt-1 text-sm text-gray-600">
                  <span className="font-medium">Relevant Coursework:</span>{" "}
                  {visibleCoursework.map((c) => c.name).join(", ")}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

interface ExperiencePreviewProps {
  items: ResumeExperience[];
}

function ExperiencePreview({ items }: ExperiencePreviewProps) {
  const visibleItems = items
    .filter((item) => item.visible)
    .sort((a, b) => a.order - b.order);

  if (visibleItems.length === 0) return null;

  return (
    <section>
      <h2 className="mb-2 border-b border-gray-400 pb-1 text-sm font-bold uppercase tracking-wider">
        Experience
      </h2>
      <div className="space-y-4">
        {visibleItems.map((item) => {
          const visibleBullets = item.bullets
            .filter((b) => b.visible)
            .sort((a, b) => a.order - b.order);

          return (
            <div key={item.id}>
              <div className="flex justify-between">
                <div>
                  <span className="font-semibold">{item.title || "Position"}</span>
                  {item.company && (
                    <span className="text-gray-700"> - {item.company}</span>
                  )}
                </div>
                <span className="text-sm text-gray-600">
                  {item.startDate || "Start"} - {item.endDate || "Present"}
                </span>
              </div>
              {visibleBullets.length > 0 && (
                <ul className="mt-1 ml-4 list-disc space-y-0.5 text-sm">
                  {visibleBullets.map((bullet) => (
                    <li key={bullet.id}>{bullet.text || "..."}</li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

interface SkillsPreviewProps {
  items: ResumeSkillCategory[];
}

function SkillsPreview({ items }: SkillsPreviewProps) {
  const visibleItems = items
    .filter((item) => item.visible)
    .sort((a, b) => a.order - b.order);

  if (visibleItems.length === 0) return null;

  return (
    <section>
      <h2 className="mb-2 border-b border-gray-400 pb-1 text-sm font-bold uppercase tracking-wider">
        Skills
      </h2>
      <div className="space-y-1">
        {visibleItems.map((category) => {
          const visibleSkills = category.skills.filter((s) => s.visible);
          if (visibleSkills.length === 0) return null;

          return (
            <div key={category.id} className="text-sm">
              <span className="font-semibold">{category.name || "Category"}:</span>{" "}
              {visibleSkills.map((s) => s.name).join(", ")}
            </div>
          );
        })}
      </div>
    </section>
  );
}

interface ProjectsPreviewProps {
  items: ResumeProject[];
}

function ProjectsPreview({ items }: ProjectsPreviewProps) {
  const visibleItems = items
    .filter((item) => item.visible)
    .sort((a, b) => a.order - b.order);

  if (visibleItems.length === 0) return null;

  return (
    <section>
      <h2 className="mb-2 border-b border-gray-400 pb-1 text-sm font-bold uppercase tracking-wider">
        Projects
      </h2>
      <div className="space-y-3">
        {visibleItems.map((item) => {
          const visibleBullets = item.bullets
            .filter((b) => b.visible)
            .sort((a, b) => a.order - b.order);

          return (
            <div key={item.id}>
              <div className="flex items-baseline gap-2">
                <span className="font-semibold">{item.name || "Project"}</span>
                {item.tech.length > 0 && (
                  <span className="text-xs text-gray-500">
                    ({item.tech.join(", ")})
                  </span>
                )}
              </div>
              {item.description && (
                <p className="mt-0.5 text-sm text-gray-600">{item.description}</p>
              )}
              {visibleBullets.length > 0 && (
                <ul className="mt-1 ml-4 list-disc space-y-0.5 text-sm">
                  {visibleBullets.map((bullet) => (
                    <li key={bullet.id}>{bullet.text || "..."}</li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

