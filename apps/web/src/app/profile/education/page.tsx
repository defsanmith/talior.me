"use client";

import { EducationSection } from "@/components/profile";
import { useGetProfileQuery } from "@/store/api/profile/queries";

export default function EducationPage() {
  const { data, isLoading } = useGetProfileQuery();

  const profile = data?.data;

  return (
    <EducationSection
      education={profile?.education ?? []}
      isLoading={isLoading}
    />
  );
}
