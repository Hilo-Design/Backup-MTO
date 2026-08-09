import React from "react";
import { cn } from "@/lib/utils";

interface CircularProgressProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  label: string;
  sublabel?: string;
  color?: string;
  className?: string;
}

export function CircularProgress({
  value,
  max,
  size = 120,
  strokeWidth = 12,
  label,
  sublabel,
  color = "text-primary",
  className,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const safeValue = Math.min(Math.max(value, 0), max);
  const percent = max > 0 ? safeValue / max : 0;
  const offset = circumference - percent * circumference;

  return (
    <div className={cn("relative flex flex-col items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-muted"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn("transition-all duration-1000 ease-out", color)}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-xl font-bold text-foreground leading-none">{value}</span>
        <span className="text-[10px] font-medium text-muted-foreground mt-1 uppercase tracking-wider">{label}</span>
        {sublabel && <span className="text-[9px] text-muted-foreground">{sublabel}</span>}
      </div>
    </div>
  );
}

export function ProgressBar({
  value,
  max,
  label,
  color = "bg-primary",
}: {
  value: number;
  max: number;
  label: string;
  color?: string;
}) {
  const safeValue = Math.min(Math.max(value, 0), max);
  const percent = max > 0 ? (safeValue / max) * 100 : 0;

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs font-medium mb-1.5">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground">
          {value} / {max}
        </span>
      </div>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-1000 ease-out", color)}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
