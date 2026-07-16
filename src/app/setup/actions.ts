"use server";

/**
 * First-run setup actions (Server Actions).
 *
 * Two operations, both gated to the unconfigured (first-run) state so they can't
 * be used to probe arbitrary hosts from, or silently re-point, a live instance:
 *
 *   testConnectionAction   live, read-only probe of a URL + API key (the wizard's
 *                          "Test" button); persists nothing
 *   completeSetupAction    validate + persist the whole connection via setConfig,
 *                          then send the operator into the console
 *
 * Both actions are reachable without a session (the console has none yet during
 * first-run and /setup is proxy-exempt), so on a deployment that will be exposed
 * to an untrusted network before it is configured, set HEADTOWER_SETUP_TOKEN to
 * a random string: both actions then require it, closing the window in which an
 * anonymous caller could re-point the instance or use the probe for SSRF. When
 * the env var is unset the behaviour is unchanged (whoever reaches an
 * unconfigured instance first configures it, and it self-closes once set).
 *
 * Persistence is atomic on finish: the wizard collects everything client-side and
 * only writes once, so a half-finished wizard never leaves a partial config.
 */

import { redirect } from "next/navigation";
import {
  getConfig,
  setConfig,
  testHeadscaleConnection,
  type ConnectionTestResult,
} from "@/lib/config";
import { recordAudit } from "@/lib/audit";
import {
  MIN_SESSION_SECRET_LENGTH,
  sessionSecretState,
} from "@/app/(app)/settings/authentication/session-secret";

/**
 * True when no HEADTOWER_SETUP_TOKEN is configured, or the caller supplied the
 * matching one. Compared with a length-safe equality so a mismatch can't be
 * timed. When set, an unset/wrong token blocks the setup actions.
 */
function setupTokenOk(provided: string | undefined): boolean {
  const required = process.env.HEADTOWER_SETUP_TOKEN?.trim();
  if (!required) return true;
  const got = (provided ?? "").trim();
  if (got.length !== required.length) return false;
  let diff = 0;
  for (let i = 0; i < required.length; i++) {
    diff |= required.charCodeAt(i) ^ got.charCodeAt(i);
  }
  return diff === 0;
}

const SETUP_TOKEN_REJECTED =
  "This instance requires a setup token. Enter the value of HEADTOWER_SETUP_TOKEN.";

/** Live-probe a candidate connection. Refused once the app is already set up. */
export async function testConnectionAction(input: {
  url: string;
  apiKey: string;
  token?: string;
}): Promise<ConnectionTestResult> {
  if (getConfig().headscale) {
    return {
      ok: false,
      status: "error",
      message: "Headtower is already configured.",
    };
  }
  if (!setupTokenOk(input.token)) {
    return { ok: false, status: "error", message: SETUP_TOKEN_REJECTED };
  }
  return testHeadscaleConnection(input.url, input.apiKey);
}

export interface CompleteSetupInput {
  headscale: { url: string; apiKey: string };
  /** OIDC provider, or null for operator (API-key) mode. */
  oidc: { issuer: string; clientId: string; clientSecret: string } | null;
  /** Setup token, required only when HEADTOWER_SETUP_TOKEN is configured. */
  token?: string;
}

export type CompleteSetupResult = { ok: false; error: string };

/**
 * Persist the wizard's result and enter the console. On success this redirects
 * (so it does not return); it only returns on a validation failure so the wizard
 * can surface the reason inline.
 */
export async function completeSetupAction(
  input: CompleteSetupInput,
): Promise<CompleteSetupResult> {
  // Already configured: nothing to persist; just enter the console.
  if (getConfig().headscale) redirect("/");

  if (!setupTokenOk(input.token)) {
    return { ok: false, error: SETUP_TOKEN_REJECTED };
  }

  // Mirror the Authentication view's guard: OIDC sign-in signs its session
  // cookie with HEADTOWER_SESSION_SECRET, which proxy.ts verifies before any DB
  // read. Enabling OIDC here without it would lock the operator out on the very
  // next request, so refuse it with a reason the wizard surfaces inline.
  if (input.oidc) {
    const secret = sessionSecretState();
    if (secret.status !== "ok") {
      return {
        ok: false,
        error:
          secret.status === "missing"
            ? `Set HEADTOWER_SESSION_SECRET (at least ${MIN_SESSION_SECRET_LENGTH} characters) before enabling single sign-on, or you will be locked out.`
            : `HEADTOWER_SESSION_SECRET is too short (${secret.length} chars). Use at least ${MIN_SESSION_SECRET_LENGTH} characters before enabling single sign-on.`,
      };
    }
  }

  try {
    setConfig({ headscale: input.headscale, oidc: input.oidc });
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Could not save the configuration.",
    };
  }

  // Best-effort trail; there is no signed-in principal yet during first-run.
  await recordAudit({
    actor: "operator",
    action: "config.setup",
    targetType: "config",
    targetName: hostOf(input.headscale.url),
    detail: {
      headscale: hostOf(input.headscale.url),
      identity: input.oidc ? "oidc" : "operator-mode",
    },
  }).catch(() => {});

  // Fresh connection is live: enter the console (which routes on to /login when
  // OIDC was just enabled, since there is no session yet).
  redirect("/");
}

/** Host of a URL for the audit label; falls back to the raw string. */
function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
