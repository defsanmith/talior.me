"use client";

import { UserInfoSection } from "@/components/profile";
import { useGetProfileQuery } from "@/store/api/profile/queries";

export default function ProfilePage() {
  const { data, isLoading } = useGetProfileQuery();

  const profile = data?.data;

  return <UserInfoSection user={profile?.user ?? null} isLoading={isLoading} />;
}
