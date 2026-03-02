"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCreateCertificationMutation,
  useDeleteCertificationMutation,
  useUpdateCertificationMutation,
} from "@/store/api/profile/queries";
import { ProfileCertification } from "@tailor.me/shared";
import { Award, CalendarDays, ExternalLink, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { InlineTextField } from "./inline-text-field";

interface CertificationsSectionProps {
  certifications: ProfileCertification[];
  isLoading?: boolean;
}

export function CertificationsSection({
  certifications,
  isLoading,
}: CertificationsSectionProps) {
  const [createCertification, { isLoading: isCreating }] =
    useCreateCertificationMutation();
  const [updateCertification] = useUpdateCertificationMutation();
  const [deleteCertification] = useDeleteCertificationMutation();

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newCert, setNewCert] = useState({
    title: "",
    issuer: "",
    issueDate: "",
    expirationDate: "",
    credentialUrl: "",
  });

  const handleCreateCertification = async () => {
    if (!newCert.title || !newCert.issuer) return;
    await createCertification({
      title: newCert.title,
      issuer: newCert.issuer,
      issueDate: newCert.issueDate || null,
      expirationDate: newCert.expirationDate || null,
      credentialUrl: newCert.credentialUrl || null,
    });
    setNewCert({
      title: "",
      issuer: "",
      issueDate: "",
      expirationDate: "",
      credentialUrl: "",
    });
    setIsAddingNew(false);
  };

  const handleUpdateField = async (
    id: string,
    field: string,
    value: string,
  ) => {
    await updateCertification({
      id,
      data: { [field]: value || null },
    });
  };

  const handleDeleteCertification = async (id: string) => {
    if (confirm("Are you sure you want to delete this certification?")) {
      await deleteCertification(id);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Certifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Certifications
          </CardTitle>
          <CardDescription>Your professional certifications</CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAddingNew(true)}
          disabled={isAddingNew}
        >
          <Plus className="mr-1 h-4 w-4" />
          Add
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAddingNew && (
          <div className="space-y-3 rounded-lg border border-dashed p-4">
            <Input
              placeholder="Certification title (e.g., AWS Solutions Architect)"
              value={newCert.title}
              onChange={(e) =>
                setNewCert({ ...newCert, title: e.target.value })
              }
            />
            <Input
              placeholder="Issuing organization (e.g., Amazon Web Services)"
              value={newCert.issuer}
              onChange={(e) =>
                setNewCert({ ...newCert, issuer: e.target.value })
              }
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Issue date
                </label>
                <Input
                  type="month"
                  value={newCert.issueDate}
                  onChange={(e) =>
                    setNewCert({ ...newCert, issueDate: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Expiration date (leave blank if none)
                </label>
                <Input
                  type="month"
                  value={newCert.expirationDate}
                  onChange={(e) =>
                    setNewCert({ ...newCert, expirationDate: e.target.value })
                  }
                />
              </div>
            </div>
            <Input
              placeholder="Credential URL (optional)"
              value={newCert.credentialUrl}
              onChange={(e) =>
                setNewCert({ ...newCert, credentialUrl: e.target.value })
              }
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAddingNew(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreateCertification}
                disabled={isCreating || !newCert.title || !newCert.issuer}
              >
                Add Certification
              </Button>
            </div>
          </div>
        )}

        {certifications.map((cert) => (
          <CertificationCard
            key={cert.id}
            cert={cert}
            onUpdateField={handleUpdateField}
            onDelete={handleDeleteCertification}
          />
        ))}

        {certifications.length === 0 && !isAddingNew && (
          <p className="py-8 text-center text-muted-foreground">
            No certifications added yet. Click &quot;Add&quot; to get started.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface CertificationCardProps {
  cert: ProfileCertification;
  onUpdateField: (id: string, field: string, value: string) => void;
  onDelete: (id: string) => void;
}

function CertificationCard({
  cert,
  onUpdateField,
  onDelete,
}: CertificationCardProps) {
  return (
    <div className="group rounded-lg border p-4 transition-colors hover:bg-muted/50">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <InlineTextField
            value={cert.title}
            onSave={(value) => onUpdateField(cert.id, "title", value)}
            className="text-lg font-semibold"
            validate={(v) => (v.length < 1 ? "Title is required" : null)}
          />
          <InlineTextField
            value={cert.issuer}
            onSave={(value) => onUpdateField(cert.id, "issuer", value)}
            className="text-muted-foreground"
            validate={(v) =>
              v.length < 1 ? "Issuing organization is required" : null
            }
          />
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            <InlineTextField
              value={cert.issueDate || ""}
              onSave={(value) => onUpdateField(cert.id, "issueDate", value)}
              placeholder="Issue date"
            />
            {cert.issueDate && (
              <>
                <span>–</span>
                <InlineTextField
                  value={cert.expirationDate || ""}
                  onSave={(value) =>
                    onUpdateField(cert.id, "expirationDate", value)
                  }
                  placeholder="Expiration (blank = no expiry)"
                />
              </>
            )}
          </div>
          {cert.credentialUrl ? (
            <div className="flex items-center gap-1 text-sm">
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              <a
                href={cert.credentialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="max-w-xs truncate text-primary hover:underline"
              >
                {cert.credentialUrl}
              </a>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <ExternalLink className="h-3.5 w-3.5" />
              <InlineTextField
                value=""
                onSave={(value) =>
                  onUpdateField(cert.id, "credentialUrl", value)
                }
                placeholder="Add credential URL"
              />
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive opacity-0 hover:text-destructive group-hover:opacity-100"
          onClick={() => onDelete(cert.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
