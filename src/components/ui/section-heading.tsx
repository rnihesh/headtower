import * as React from "react";
import { cn } from "@/lib/cn";

export interface SectionHeadingProps {
  title: React.ReactNode;
  /**
   * Kept for API compatibility; no longer rendered. The page title already
   * says where you are, so a second label above it was noise.
   */
  eyebrow?: React.ReactNode;
  description?: React.ReactNode;
  /** Right-aligned actions (buttons, filters). */
  children?: React.ReactNode;
  className?: string;
}

export function SectionHeading({
  title,
  description,
  children,
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn("flex flex-wrap items-end justify-between gap-4", className)}
    >
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight text-ink">{title}</h1>
        {description != null && (
          <p className="max-w-prose text-sm text-ink-muted">{description}</p>
        )}
      </div>
      {children != null && (
        <div className="flex items-center gap-2">{children}</div>
      )}
    </div>
  );
}
