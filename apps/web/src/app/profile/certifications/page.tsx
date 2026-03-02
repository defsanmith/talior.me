"use client";

import { CertificationsSection } from "@/components/profile";
import { useGetProfileQuery } from "@/store/api/profile/queries";

export default function CertificationsPage() {
  const { data, isLoading } = useGetProfileQuery();

  const profile = data?.data;

  return (
    <CertificationsSection
      certifications={profile?.certifications ?? []}
      isLoading={isLoading}
    />
  );
}
