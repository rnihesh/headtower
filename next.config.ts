import type { NextConfig } from "next";

// Optional sub-path mount (e.g. "/admin"), baked in at build time via env.
// Leave unset to serve at the root.
const basePath = process.env.HEADTOWER_BASE_PATH?.trim() || undefined;

// Baseline security response headers for every route. The console is a VPN
// control plane, so it must never be framed (clickjacking), must not be
// MIME-sniffed, and should leak as little referrer as possible cross-origin.
// The CSP here is deliberately narrow: `frame-ancestors 'none'` (the modern
// equivalent of X-Frame-Options: DENY) without a full script/style policy, so
// it can't break Next's inline bootstrap/theme scripts. Tighten later with a
// nonce-based CSP if the inline scripts are reworked to carry one.
const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
] as const;

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle so the Docker image stays lean.
  output: "standalone",
  // AGENTS.md is hand-maintained; don't let `next dev` rewrite it.
  agentRules: false,
  ...(basePath ? { basePath } : {}),
  async headers() {
    return [{ source: "/:path*", headers: [...SECURITY_HEADERS] }];
  },
};

export default nextConfig;
