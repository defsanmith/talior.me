"use client";

import { cn } from "@/lib/utils";
import type { EvaluationDimension } from "@tailor.me/shared";
import { getScoreColor } from "./score-display";

interface DimensionBarsProps {
  dimensions: EvaluationDimension[];
}

export function DimensionBars({ dimensions }: DimensionBarsProps) {
  const sorted = [...dimensions].sort((a, b) => b.weight - a.weight);

  return (
    <div className="space-y-3">
      {sorted.map((dim) => {
        const colors = getScoreColor(dim.score);
        const pct = (dim.score / 5) * 100;

        return (
          <div key={dim.name} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{dim.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {Math.round(dim.weight * 100)}% weight
                </span>
                <span className={cn("font-semibold tabular-nums", colors.text)}>
                  {dim.score.toFixed(1)}
                </span>
              </div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full transition-all", colors.bar)}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{dim.reasoning}</p>
          </div>
        );
      })}
    </div>
  );
}
