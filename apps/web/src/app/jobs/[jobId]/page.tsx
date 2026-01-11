"use client";

import { useGetJobByIdQuery } from "@/store/api/jobs/queries";
import { ResumeJson } from "@tailor.me/shared";
import { useParams } from "next/navigation";

interface JobBullet {
  id: string;
  originalText: string;
  rewrittenText: string;
  verifierNote?: string;
}

export default function JobDetailPage() {
  const params = useParams();

  const jobId = params?.jobId as string;
  const { data: response, isLoading, error } = useGetJobByIdQuery(jobId);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (error || !response?.data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-xl">Job not found</div>
      </div>
    );
  }

  const data = response.data;

  return (
    <div>
      <div>
        <div>
          <h1>Resume Details</h1>
        </div>
        <div>
          <ResumeView resume={data.result} />
        </div>
      </div>
    </div>
  );
}

function ResumeView({ resume }: { resume: ResumeJson }) {
  return (
    <div className="max-w-4xl space-y-6">
      {/* Skills */}
      <div>
        <h2 className="mb-3 text-xl font-bold">Skills</h2>
        <div className="flex flex-wrap gap-2">
          {resume.skills.map((skill, i) => (
            <span
              key={i}
              className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* Experience */}
      <div>
        <h2 className="mb-3 text-xl font-bold">Experience</h2>
        <div className="space-y-6">
          {resume.experiences.map((exp, i) => (
            <div key={i} className="border-l-4 border-blue-600 pl-4">
              <h3 className="text-lg font-semibold">{exp.title}</h3>
              <p className="mb-2 text-gray-600">
                {exp.company} | {exp.startDate} - {exp.endDate || "Present"}
              </p>
              <ul className="list-inside list-disc space-y-1 text-gray-700">
                {exp.bullets.map((bullet, j) => (
                  <li key={j}>{bullet}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Projects */}
      {resume.projects && resume.projects.length > 0 && (
        <div>
          <h2 className="mb-3 text-xl font-bold">Projects</h2>
          <div className="space-y-4">
            {resume.projects.map((project, i) => (
              <div key={i}>
                <h3 className="font-semibold">{project.name}</h3>
                <p className="mb-1 text-gray-700">{project.description}</p>
                <div className="flex flex-wrap gap-2">
                  {project.tech.map((tech, j) => (
                    <span
                      key={j}
                      className="rounded bg-gray-200 px-2 py-1 text-xs"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {resume.education && resume.education.length > 0 && (
        <div>
          <h2 className="mb-3 text-xl font-bold">Education</h2>
          <div className="space-y-2">
            {resume.education.map((edu, i) => (
              <div key={i}>
                <h3 className="font-semibold">{edu.degree}</h3>
                <p className="text-gray-600">
                  {edu.institution}{" "}
                  {edu.graduationDate && `| ${edu.graduationDate}`}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
