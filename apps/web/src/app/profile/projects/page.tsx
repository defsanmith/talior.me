"use client";

import { ProjectsSection } from "@/components/profile";
import { useGetProfileQuery } from "@/store/api/profile/queries";

export default function ProjectsPage() {
  const { data, isLoading } = useGetProfileQuery();

  const profile = data?.data;

  return (
    <ProjectsSection
      projects={profile?.projects ?? []}
      skills={profile?.skills ?? []}
      isLoading={isLoading}
    />
  );
}
