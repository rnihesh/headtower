/**
 * Headtower brand mark: a beacon over its cone of light, housed in a rounded
 * tile. Theme-adaptive by design - every part is painted from a semantic token
 * so the mark flips cleanly with the console theme:
 *
 *   - the tile is `fill-ink` (a dark tile in light theme, a light tile in dark),
 *   - the beacon dot is `fill-canvas` at full strength (the tile's opposite), and
 *   - the cone is the same fill at reduced opacity, so it reads as the dot's
 *     wash of light rather than a second shape.
 *
 * Monochrome on purpose: no accent hue, so the mark sits quietly in both
 * themes. Size it via `className`.
 */
export function BeaconMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 256 256"
      className={className}
      role="img"
      aria-label="Headtower"
    >
      <rect width="256" height="256" rx="56" className="fill-ink" />
      <path
        d="M128 92 L180 196 L76 196 Z"
        className="fill-canvas"
        opacity="0.55"
      />
      <circle cx="128" cy="74" r="18" className="fill-canvas" />
    </svg>
  );
}
