'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ResumeJson } from '@tailor.me/shared';

interface JobBullet {
  id: string;
  originalText: string;
  rewrittenText: string;
  verifierNote?: string;
}

interface JobData {
  job: any;
  bullets: JobBullet[];
  result: ResumeJson | null;
}

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.jobId as string;

  const [data, setData] = useState<JobData | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'resume' | 'diff'>('resume');

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/jobs/${jobId}`);
        const jobData = await res.json();
        setData(jobData);
      } catch (error) {
        console.error('Failed to fetch job:', error);
      } finally {
        setLoading(false);
      }
    };

    if (jobId) {
      fetchJob();
    }
  }, [jobId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Job not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-blue-600 hover:text-blue-700 font-semibold mb-4"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Resume Details</h1>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex gap-4 mb-4">
            <button
              onClick={() => setView('resume')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                view === 'resume'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Resume
            </button>
            <button
              onClick={() => setView('diff')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                view === 'diff'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Bullet Diff ({data.bullets.length})
            </button>
          </div>

          {view === 'resume' && data.result && <ResumeView resume={data.result} />}
          {view === 'diff' && <DiffView bullets={data.bullets} />}
        </div>
      </div>
    </div>
  );
}

function ResumeView({ resume }: { resume: ResumeJson }) {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Skills */}
      <div>
        <h2 className="text-xl font-bold mb-3">Skills</h2>
        <div className="flex flex-wrap gap-2">
          {resume.skills.map((skill, i) => (
            <span
              key={i}
              className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* Experience */}
      <div>
        <h2 className="text-xl font-bold mb-3">Experience</h2>
        <div className="space-y-6">
          {resume.experiences.map((exp, i) => (
            <div key={i} className="border-l-4 border-blue-600 pl-4">
              <h3 className="text-lg font-semibold">{exp.title}</h3>
              <p className="text-gray-600 mb-2">
                {exp.company} | {exp.startDate} - {exp.endDate || 'Present'}
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
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
          <h2 className="text-xl font-bold mb-3">Projects</h2>
          <div className="space-y-4">
            {resume.projects.map((project, i) => (
              <div key={i}>
                <h3 className="font-semibold">{project.name}</h3>
                <p className="text-gray-700 mb-1">{project.description}</p>
                <div className="flex flex-wrap gap-2">
                  {project.tech.map((tech, j) => (
                    <span key={j} className="text-xs bg-gray-200 px-2 py-1 rounded">
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
          <h2 className="text-xl font-bold mb-3">Education</h2>
          <div className="space-y-2">
            {resume.education.map((edu, i) => (
              <div key={i}>
                <h3 className="font-semibold">{edu.degree}</h3>
                <p className="text-gray-600">
                  {edu.institution} {edu.graduationDate && `| ${edu.graduationDate}`}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DiffView({ bullets }: { bullets: JobBullet[] }) {
  return (
    <div className="space-y-6">
      {bullets.map((bullet, i) => (
        <div key={bullet.id} className="border rounded-lg p-4">
          <div className="text-sm font-semibold text-gray-500 mb-2">Bullet {i + 1}</div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-semibold text-gray-500 mb-1">Original</div>
              <p className="text-gray-700 bg-red-50 p-3 rounded">{bullet.originalText}</p>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-500 mb-1">Rewritten</div>
              <p className="text-gray-700 bg-green-50 p-3 rounded">{bullet.rewrittenText}</p>
            </div>
          </div>
          {bullet.verifierNote && (
            <div className="mt-3 text-sm bg-yellow-50 border border-yellow-200 text-yellow-800 p-2 rounded">
              <span className="font-semibold">Verifier Note:</span> {bullet.verifierNote}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
