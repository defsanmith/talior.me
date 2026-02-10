"use client";

import { SkillsSection } from "@/components/profile";
import { useGetProfileQuery } from "@/store/api/profile/queries";

export default function SkillsPage() {
  const { data, isLoading } = useGetProfileQuery();

  const profile = data?.data;

  return (
    <SkillsSection
      skills={profile?.skills ?? []}
      skillCategories={profile?.skillCategories ?? []}
      isLoading={isLoading}
    />
  );
}
