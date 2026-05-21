"use client";

import { cn } from "@/lib/utils";
import type { GapAnalysisItem } from "@tailor.me/shared";
import { AlertTriangle, Circle, Info } from "lucide-react";

interface GapAnalysisProps {
  gaps: GapAnalysisItem[];
}

const severityConfig = {
  "hard-blocker": {
    label: "Hard Blockers",
    icon: AlertTriangle,
    iconClass: "text-red-500",
    borderClass: "border-red-500/30",
    bgClass: "bg-red-500/5",
  },
  moderate: {
    label: "Moderate Gaps",
    icon: Circle,
    iconClass: "text-yellow-500",
    borderClass: "border-yellow-500/30",
    bgClass: "bg-yellow-500/5",
  },
  "nice-to-have": {
    label: "Nice to Have",
    icon: Info,
    iconClass: "text-muted-foreground",
    borderClass: "border-muted/30",
    bgClass: "bg-muted/5",
  },
} as const;

const severityOrder: GapAnalysisItem["severity"][] = [
  "hard-blocker",
  "moderate",
  "nice-to-have",
];

export function GapAnalysis({ gaps }: GapAnalysisProps) {
  if (gaps.length === 0) return null;

  const grouped = severityOrder
    .map((severity) => ({
      severity,
      items: gaps.filter((g) => g.severity === severity),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="space-y-4">
      {grouped.map(({ severity, items }) => {
        const config = severityConfig[severity];
        const Icon = config.icon;

        return (
          <div key={severity}>
            <div className="mb-2 flex items-center gap-2">
              <Icon className={cn("h-4 w-4", config.iconClass)} />
              <h4 className="text-sm font-semibold">
                {config.label} ({items.length})
              </h4>
            </div>
            <div className="space-y-2">
              {items.map((gap, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "rounded-md border p-3",
                    config.borderClass,
                    config.bgClass,
                  )}
                >
                  <p className="text-sm font-medium">{gap.requirement}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {gap.detail}
                  </p>
                  {gap.mitigationSuggestion && (
                    <p className="mt-1.5 text-xs italic text-muted-foreground">
                      Suggestion: {gap.mitigationSuggestion}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
