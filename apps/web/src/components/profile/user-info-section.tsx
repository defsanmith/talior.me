"use client";

import { ProfileUser } from "@tailor.me/shared";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { InlineTextField } from "./inline-text-field";
import { useUpdateUserMutation } from "@/store/api/profile/queries";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Globe,
  Linkedin,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface UserInfoSectionProps {
  user: ProfileUser | null;
  isLoading?: boolean;
}

export function UserInfoSection({ user, isLoading }: UserInfoSectionProps) {
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();

  const handleUpdateField = async (field: string, value: string) => {
    if (!user) return;
    await updateUser({ [field]: value || null });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-8 w-56" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No user found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Profile
        </CardTitle>
        <CardDescription>
          Your personal and contact information
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Name */}
          <div className="space-y-1">
            <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <User className="h-4 w-4" />
              Name
            </label>
            <InlineTextField
              value={user.name}
              onSave={(v) => handleUpdateField("name", v)}
              placeholder="Enter your name"
              isLoading={isUpdating}
              validate={(v) => (v.length < 1 ? "Name is required" : null)}
              className="text-lg font-semibold"
            />
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Mail className="h-4 w-4" />
              Email
            </label>
            <InlineTextField
              value={user.email}
              onSave={(v) => handleUpdateField("email", v)}
              placeholder="Enter your email"
              isLoading={isUpdating}
              validate={(v) =>
                !v.includes("@") ? "Please enter a valid email" : null
              }
            />
          </div>

          {/* Phone */}
          <div className="space-y-1">
            <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Phone className="h-4 w-4" />
              Phone
            </label>
            <InlineTextField
              value={user.phone || ""}
              onSave={(v) => handleUpdateField("phone", v)}
              placeholder="Add phone number"
              isLoading={isUpdating}
            />
          </div>

          {/* Location */}
          <div className="space-y-1">
            <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <MapPin className="h-4 w-4" />
              Location
            </label>
            <InlineTextField
              value={user.location || ""}
              onSave={(v) => handleUpdateField("location", v)}
              placeholder="Add location (e.g., San Francisco, CA)"
              isLoading={isUpdating}
            />
          </div>

          {/* Website */}
          <div className="space-y-1">
            <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Globe className="h-4 w-4" />
              Website
            </label>
            <InlineTextField
              value={user.website || ""}
              onSave={(v) => handleUpdateField("website", v)}
              placeholder="Add personal website"
              isLoading={isUpdating}
            />
          </div>

          {/* LinkedIn */}
          <div className="space-y-1">
            <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Linkedin className="h-4 w-4" />
              LinkedIn
            </label>
            <InlineTextField
              value={user.linkedin || ""}
              onSave={(v) => handleUpdateField("linkedin", v)}
              placeholder="Add LinkedIn profile URL"
              isLoading={isUpdating}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
