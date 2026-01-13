"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Router from "@/lib/router";
import { useCreateJobMutation } from "@/store/api/jobs/queries";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function HomePage() {
  const [jobDescription, setJobDescription] = useState("");
  const router = useRouter();
  const [createJob, { isLoading, error }] = useCreateJobMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createJob({ jobDescription }).unwrap();
      router.push(Router.DASHBOARD);
    } catch (err) {
      // Error is handled by RTK Query
      console.error("Failed to create job:", err);
    }
  };

  return (
    <div>
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl">
          <div className="mb-12 text-center">
            <h1 className="mb-4 text-5xl font-bold text-gray-900">Tailor.me</h1>
            <p className="text-xl text-gray-600">
              AI-powered resume builder that crafts your perfect resume for any
              job
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Create Resume</CardTitle>
              <CardDescription>
                Paste the job description to get started
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="jd">Job Description</Label>
                  <Textarea
                    id="jd"
                    value={jobDescription}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setJobDescription(e.target.value)
                    }
                    className="h-64 resize-none"
                    placeholder="Paste the full job description here..."
                    required
                    minLength={10}
                  />
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      {"data" in error &&
                      typeof error.data === "object" &&
                      error.data &&
                      "message" in error.data
                        ? String(error.data.message)
                        : "Failed to create job"}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-4">
                  <Button type="submit" disabled={isLoading} className="flex-1">
                    {isLoading ? "Creating..." : "Build Resume"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/dashboard")}
                  >
                    Dashboard
                  </Button>
                </div>
              </form>

              <div className="mt-8 border-t pt-6">
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
