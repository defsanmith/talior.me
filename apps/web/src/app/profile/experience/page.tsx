"use client";

import { ExperienceSection } from "@/components/profile";
import { useGetProfileQuery } from "@/store/api/profile/queries";

export default function ExperiencePage() {
  const { data, isLoading } = useGetProfileQuery();

  const profile = data?.data;

  return (
    <ExperienceSection
      experiences={profile?.experiences ?? []}
      skills={profile?.skills ?? []}
      isLoading={isLoading}
    />
  );
}
