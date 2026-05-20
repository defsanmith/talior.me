"use client";

import { UserInfoSection } from "@/components/profile";
import { Button } from "@/components/ui/button";
import { downloadFile, generateProfileMarkdown } from "@/lib/profile-export";
import { useGetProfileQuery, useLazyGetProfileExportPdfQuery } from "@/store/api/profile/queries";
import { Download, FileText } from "lucide-react";
import { useState } from "react";

export default function ProfilePage() {
  const { data, isLoading } = useGetProfileQuery();
  const [triggerPdfExport] = useLazyGetProfileExportPdfQuery();
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const profile = data?.data;

  const handleExportMarkdown = () => {
    if (!profile) return;
    const md = generateProfileMarkdown(profile);
    const firstName = profile.user?.firstName || "profile";
    const lastName = profile.user?.lastName || "";
    const filename = lastName ? `${firstName}_${lastName}_profile.md` : `${firstName}_profile.md`;
    downloadFile(md, filename, "text/markdown");
  };

  const handleExportPdf = async () => {
    if (!profile) return;
    setIsExportingPdf(true);
    try {
      const blob = await triggerPdfExport().unwrap();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const firstName = profile.user?.firstName || "profile";
      const lastName = profile.user?.lastName || "";
      link.download = lastName
        ? `${firstName}_${lastName}_profile.pdf`
        : `${firstName}_profile.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export PDF:", error);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportMarkdown}
          disabled={isLoading || !profile}
        >
          <FileText className="mr-2 h-4 w-4" />
          Export Markdown
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportPdf}
          disabled={isLoading || !profile || isExportingPdf}
        >
          <Download className="mr-2 h-4 w-4" />
          {isExportingPdf ? "Exporting…" : "Export PDF"}
        </Button>
      </div>
      <UserInfoSection user={profile?.user ?? null} isLoading={isLoading} />
    </div>
  );
}
