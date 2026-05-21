"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { ProfileEvaluation } from "@tailor.me/shared";
import { CheckCircle, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { DimensionBars } from "./dimension-bars";
import { GapAnalysis } from "./gap-analysis";
import { ScoreDisplay } from "./score-display";

interface EvaluationReportProps {
  evaluation: ProfileEvaluation;
  isGenerating?: boolean;
  onGenerate?: () => void;
  onReEvaluate?: () => void;
  isGenerateLoading?: boolean;
  isReEvaluateLoading?: boolean;
}

const recommendationConfig = {
  "strong-fit": { label: "Strong Fit", variant: "default" as const, className: "bg-emerald-600 hover:bg-emerald-700" },
  "moderate-fit": { label: "Moderate Fit", variant: "default" as const, className: "bg-yellow-600 hover:bg-yellow-700" },
  "weak-fit": { label: "Weak Fit", variant: "destructive" as const, className: "" },
} as const;

export function EvaluationReport({
  evaluation,
  isGenerating,
  onGenerate,
  onReEvaluate,
  isGenerateLoading,
  isReEvaluateLoading,
}: EvaluationReportProps) {
  const recConfig = recommendationConfig[evaluation.recommendation];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Score + Recommendation Header */}
      <Card>
        <CardContent className="flex items-center gap-6 pt-6">
          <ScoreDisplay score={evaluation.overallScore} size="lg" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant={recConfig.variant} className={recConfig.className}>
                {recConfig.label}
              </Badge>
              {evaluation.autoGenerate && (
                <Badge variant="outline" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  Auto-generating
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{evaluation.summary}</p>
          </div>
        </CardContent>
      </Card>

      {/* Strengths */}
      {evaluation.strengths.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              Key Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {evaluation.strengths.map((strength, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  {strength}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Dimension Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Dimension Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <DimensionBars dimensions={evaluation.dimensions} />
        </CardContent>
      </Card>

      {/* Gap Analysis */}
      {evaluation.gaps.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Gap Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <GapAnalysis gaps={evaluation.gaps} />
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <Separator />
      <div className="flex items-center justify-center gap-3 pb-4">
        {isGenerating ? (
          <Button disabled>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating resume...
          </Button>
        ) : (
          onGenerate && (
            <Button onClick={onGenerate} disabled={isGenerateLoading}>
              {isGenerateLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              {evaluation.autoGenerate ? "Generating..." : "Generate Resume Anyway"}
            </Button>
          )
        )}
        {onReEvaluate && (
          <Button variant="outline" onClick={onReEvaluate} disabled={isReEvaluateLoading}>
            {isReEvaluateLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Re-evaluate
          </Button>
        )}
      </div>
    </div>
  );
}
