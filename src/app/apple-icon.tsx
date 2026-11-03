import { ImageResponse } from "next/og";

/**
 * iOS home-screen icon: same beacon mark as {@link import("./icon").default},
 * at Apple's recommended 180x180. iOS applies its own corner mask and expects a
 * fully opaque background, so the tile fills the whole canvas edge to edge
 * (no transparency, no pre-rounded corners of its own).
 */

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <svg
        width={180}
        height={180}
        viewBox="0 0 256 256"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="256" height="256" fill="#171717" />
        <path d="M128 92 L180 196 L76 196 Z" fill="#fafafa" opacity={0.55} />
        <circle cx="128" cy="74" r="18" fill="#fafafa" />
      </svg>
    ),
    { ...size },
  );
}
