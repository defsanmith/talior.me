"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function HomePage() {
  const [jobDescription, setJobDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const res = await fetch("http://localhost:3001/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to create job");
      }

      const { jobId } = await res.json();
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 text-center">
            <h1 className="mb-4 text-5xl font-bold text-gray-900">Tailor.me</h1>
            <p className="text-xl text-gray-600">
              AI-powered resume builder that crafts your perfect resume for any
              job
            </p>
          </div>

          <div className="rounded-lg bg-white p-8 shadow-xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="jd"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Paste the Job Description
                </label>
                <textarea
                  id="jd"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="h-64 w-full resize-none rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  placeholder="Paste the full job description here..."
                  required
                  minLength={10}
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                  {error}
                </div>
              )}

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-blue-300"
                >
                  {isSubmitting ? "Creating..." : "Build Resume"}
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/dashboard")}
                  className="rounded-lg border border-gray-300 px-6 py-3 font-semibold transition-colors hover:bg-gray-50"
                >
                  Dashboard
                </button>
              </div>
            </form>

            <div className="mt-8 border-t border-gray-200 pt-6">
              <h3 className="mb-2 font-semibold text-gray-900">
                How it works:
              </h3>
              <ol className="list-inside list-decimal space-y-2 text-gray-600">
                <li>Paste a job description above</li>
                <li>AI analyzes the requirements and keywords</li>
                <li>Selects and tailors bullets from your profile</li>
                <li>Verifies accuracy (no hallucinations!)</li>
                <li>Generates your optimized resume</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
