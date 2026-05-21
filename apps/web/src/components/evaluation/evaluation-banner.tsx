"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { ProfileEvaluation } from "@tailor.me/shared";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { DimensionBars } from "./dimension-bars";
import { GapAnalysis } from "./gap-analysis";
import { getScoreColor } from "./score-display";

interface EvaluationBannerProps {
  evaluation: ProfileEvaluation;
}

const recommendationLabels = {
  "strong-fit": "Strong Fit",
  "moderate-fit": "Moderate Fit",
  "weak-fit": "Weak Fit",
} as const;

export function EvaluationBanner({ evaluation }: EvaluationBannerProps) {
  const [open, setOpen] = useState(false);
  const colors = getScoreColor(evaluation.overallScore);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="mb-4 rounded-lg border bg-card">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="flex h-auto w-full items-center gap-3 px-4 py-3"
          >
            <span className={`shrink-0 text-lg font-bold ${colors.text}`}>
              {evaluation.overallScore.toFixed(1)}
            </span>
            <Badge
              variant="outline"
              className={`shrink-0 ${colors.text}`}
            >
              {recommendationLabels[evaluation.recommendation]}
            </Badge>
            <span className="min-w-0 flex-1 truncate text-left text-sm text-muted-foreground">
              {evaluation.summary}
            </span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                open ? "rotate-180" : ""
              }`}
            />
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="space-y-4 border-t px-4 py-4">
            {/* Strengths */}
            {evaluation.strengths.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-semibold">Key Strengths</h4>
                <ul className="space-y-1">
                  {evaluation.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Dimensions */}
            <div>
              <h4 className="mb-2 text-sm font-semibold">Dimension Breakdown</h4>
              <DimensionBars dimensions={evaluation.dimensions} />
            </div>

            {/* Gaps */}
            {evaluation.gaps.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-semibold">Gap Analysis</h4>
                <GapAnalysis gaps={evaluation.gaps} />
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
