"use client";

import * as React from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Theme } from "@/lib/theme";
import { cn } from "@/lib/cn";
import {
  FONT_SIZE_PRESETS,
  applyFontSize,
  clearLegacyAccent,
  persistFontSize,
} from "./appearance";

export interface AppearanceFormProps {
  initialTheme: Theme;
  initialFontSize: string;
}

/**
 * Personal display preferences. Reuses the sidebar's own {@link ThemeToggle}
 * unchanged (dark / light / system), plus the base text size this page
 * introduces. The size applies live by overriding the root font-size and
 * persists to its own cookie, the same mechanism `@/lib/theme` uses for the
 * theme itself (see `./appearance.ts`). The accent is fixed mono ink; on mount
 * this also clears any accent override left by older builds.
 *
 * Known limitation: unlike the theme cookie, there is no root-layout no-flash
 * script for the text size (out of scope for a page confined to `account/`),
 * so a saved size only re-applies once this page has mounted. A fresh load of
 * another route shows the default again until Account is visited in that
 * browser. Selecting "Default" avoids the gap entirely.
 */
export function AppearanceForm({
  initialTheme,
  initialFontSize,
}: AppearanceFormProps) {
  const [fontSize, setFontSize] = React.useState(initialFontSize);

  // Re-apply on mount so landing here directly (a fresh document) reflects the
  // saved cookie immediately, not just after the next click.
  React.useEffect(() => {
    clearLegacyAccent();
    applyFontSize(initialFontSize);
    // Mount-only: selecting a new value below applies itself directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectFontSize(id: string) {
    setFontSize(id);
    persistFontSize(id);
    applyFontSize(id);
  }

  return (
    <div className="flex flex-col gap-5">
      <Row label="Theme" description="Dark, light, or follow the system.">
        <ThemeToggle initialTheme={initialTheme} />
      </Row>

      <Row label="Text size" description="Scales every control in the console.">
        <div
          className="flex items-center gap-0.5 rounded-control border border-line bg-surface-2 p-0.5"
          role="radiogroup"
          aria-label="Text size"
        >
          {FONT_SIZE_PRESETS.map((preset) => {
            const active = fontSize === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => selectFontSize(preset.id)}
                className={cn(
                  "rounded-[0.4rem] px-2.5 py-1 text-xs font-medium transition-colors",
                  active ? "bg-surface text-ink shadow-sm" : "text-ink-faint hover:text-ink",
                )}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </Row>
    </div>
  );
}

function Row({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-ink">{label}</span>
        <span className="text-xs text-ink-faint">{description}</span>
      </div>
      {children}
    </div>
  );
}
