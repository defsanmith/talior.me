"use client";

import { cn } from "@/lib/utils";

interface ScoreDisplayProps {
  score: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

function getScoreColor(score: number) {
  if (score >= 4) return { text: "text-emerald-500", stroke: "stroke-emerald-500", bg: "bg-emerald-500/10", bar: "bg-emerald-500" };
  if (score >= 3) return { text: "text-yellow-500", stroke: "stroke-yellow-500", bg: "bg-yellow-500/10", bar: "bg-yellow-500" };
  return { text: "text-red-500", stroke: "stroke-red-500", bg: "bg-red-500/10", bar: "bg-red-500" };
}

const sizeConfig = {
  sm: { outer: 40, strokeWidth: 3, fontSize: "text-sm", label: false },
  md: { outer: 72, strokeWidth: 4, fontSize: "text-2xl", label: true },
  lg: { outer: 100, strokeWidth: 5, fontSize: "text-3xl", label: true },
} as const;

export function ScoreDisplay({ score, size = "md", className }: ScoreDisplayProps) {
  const config = sizeConfig[size];
  const radius = (config.outer - config.strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 5) * circumference;
  const colors = getScoreColor(score);

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <div className="relative" style={{ width: config.outer, height: config.outer }}>
        <svg width={config.outer} height={config.outer} className="-rotate-90">
          <circle
            cx={config.outer / 2}
            cy={config.outer / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={config.strokeWidth}
            className="text-muted/30"
          />
          <circle
            cx={config.outer / 2}
            cy={config.outer / 2}
            r={radius}
            fill="none"
            strokeWidth={config.strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            strokeLinecap="round"
            className={colors.stroke}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn("font-bold", config.fontSize, colors.text)}>
            {score.toFixed(1)}
          </span>
        </div>
      </div>
      {config.label && (
        <span className="text-xs text-muted-foreground">out of 5</span>
      )}
    </div>
  );
}

export { getScoreColor };
