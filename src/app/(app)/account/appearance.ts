/**
 * Personal appearance preferences - shared constants + isomorphic helpers.
 *
 * Extends the console's theme system (`@/lib/theme`) with one more per-browser,
 * cookie-persisted preference introduced by this page: the base text size. The
 * accent is fixed (mono ink, see globals.css). Same shape as
 * `@/lib/theme`: a persisted cookie, pure normalize helpers safe to run on the
 * server (seeding the form's first render from the saved cookie), and
 * DOM-applying functions the client form calls on selection.
 *
 * No top-level access to `window`/`document`: `AccountPage` (a Server
 * Component) imports the cookie names and normalize helpers, so this file must
 * be safe to evaluate on the server. The DOM helpers only touch `document` when
 * called, which `AppearanceForm` does exclusively on the client.
 *
 * Known gap vs. `@/lib/theme`: there is no root-layout no-flash script for
 * the text size (out of this page's scope), so a saved preference only re-applies
 * once this page has mounted - see `AppearanceForm`'s doc comment.
 */

/** Cookie carrying the text-size preference, alongside `@/lib/theme`'s `ht_theme`. */
export const FONT_SIZE_COOKIE = "ht_font_size";

/** Accent cookie written by older builds; only read to clear it. */
const LEGACY_ACCENT_COOKIE = "ht_accent";

/** Persist for a year, same as the theme cookie - a non-secret UI preference. */
export const APPEARANCE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

/** One selectable base text size - every rem-based control scales from it. */
export interface FontSizePreset {
  id: string;
  label: string;
  /** Root font-size in pixels. */
  px: number;
}

export const FONT_SIZE_PRESETS: readonly FontSizePreset[] = [
  { id: "sm", label: "Compact", px: 14 },
  { id: "md", label: "Default", px: 16 },
  { id: "lg", label: "Comfortable", px: 18 },
];
export const DEFAULT_FONT_SIZE = "md";

export function isFontSizeId(value: string | null | undefined): boolean {
  return FONT_SIZE_PRESETS.some((preset) => preset.id === value);
}

/** The preference, or the default when the cookie is missing/garbage. */
export function normalizeFontSize(value: string | null | undefined): string {
  return isFontSizeId(value) ? (value as string) : DEFAULT_FONT_SIZE;
}

/**
 * Older builds let operators pick a warm accent, saved in the `ht_accent`
 * cookie and applied as inline overrides on the root element. The console is
 * mono-only now, so this clears both: the stale cookie is expired and any
 * lingering overrides are removed, letting the theme-aware ink accent in
 * globals.css apply. Safe to call when neither exists. Client-only.
 */
export function clearLegacyAccent(): void {
  const root = document.documentElement.style;
  for (const name of [
    "--color-beacon-300",
    "--color-beacon-400",
    "--color-beacon-500",
    "--color-beacon-600",
    "--color-on-beacon",
  ]) {
    root.removeProperty(name);
  }
  if (document.cookie.split("; ").some((c) => c.startsWith(`${LEGACY_ACCENT_COOKIE}=`))) {
    document.cookie = `${LEGACY_ACCENT_COOKIE}=; path=/; max-age=0; samesite=lax`;
  }
}

/** Apply a font-size preset to the document live (the root rem base). Client-only. */
export function applyFontSize(id: string): void {
  const preset = FONT_SIZE_PRESETS.find((p) => p.id === id) ?? FONT_SIZE_PRESETS[1];
  document.documentElement.style.fontSize = `${preset.px}px`;
}

/** Write the font-size cookie (client-side, via `document.cookie`). */
export function persistFontSize(id: string): void {
  document.cookie = `${FONT_SIZE_COOKIE}=${id}; path=/; max-age=${APPEARANCE_MAX_AGE_SECONDS}; samesite=lax`;
}
