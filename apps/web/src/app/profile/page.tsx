"use client";

import {
  EducationSection,
  ExperienceSection,
  ProjectsSection,
  SkillsSection,
  UserInfoSection,
} from "@/components/profile";
import { Separator } from "@/components/ui/separator";
import { useGetProfileQuery } from "@/store/api/profile/queries";

export default function ProfilePage() {
  const { data, isLoading, error } = useGetProfileQuery();

  if (error) {
    return (
      <div className="py-8">
        <div className="rounded-lg border border-destructive bg-destructive/10 p-6 text-center">
          <h2 className="text-lg font-semibold text-destructive">
            Error loading profile
          </h2>
          <p className="mt-2 text-muted-foreground">
            Please try again later or contact support.
          </p>
        </div>
      </div>
    );
  }

  const profile = data?.data;

  return (
    <div className="">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Your Profile</h1>
        <p className="mt-2 text-muted-foreground">
          Manage your personal information, experience, education, and skills.
          Click any field to edit it inline.
        </p>
      </div>

      <div className="space-y-8">
        <UserInfoSection user={profile?.user ?? null} isLoading={isLoading} />

        <Separator />

        <EducationSection
          education={profile?.education ?? []}
          isLoading={isLoading}
        />

        <Separator />

        <SkillsSection
          skills={profile?.skills ?? []}
          skillCategories={profile?.skillCategories ?? []}
          isLoading={isLoading}
        />

        <Separator />

        <ExperienceSection
          experiences={profile?.experiences ?? []}
          skills={profile?.skills ?? []}
          isLoading={isLoading}
        />

        <Separator />

        <ProjectsSection
          projects={profile?.projects ?? []}
          skills={profile?.skills ?? []}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
