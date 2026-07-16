"use server";

/**
 * Dashboard Server Actions (server-only).
 *
 * This file holds only genuine operator mutations exposed to the client. The
 * dashboard's snapshot telemetry is NOT here: it is a plain server function
 * (see ./snapshots) called during render with server-trusted counts, precisely
 * so it isn't reachable as a forgeable public endpoint.
 *
 *   setAgentEnabled   an operator mutation from the Agent widget's on/off
 *                     toggle. Gated on `settings.write` and audited like the
 *                     mutating actions elsewhere in the console.
 */

import { revalidatePath } from "next/cache";
import { ConfigError, getConfig, setConfig } from "@/lib/config";
import { audit, authorize } from "@/lib/authz";

const PATH = "/dashboard";

/** Result of {@link setAgentEnabled}. */
export type SetAgentEnabledState =
  | { status: "success"; enabled: boolean }
  | { status: "error"; error: string };

/**
 * Flip the agent sidecar on or off, keeping its configured URL unchanged. Gated
 * on `settings.write` - the dashboard only renders the toggle for a session that
 * holds it, but the action re-checks, since a client is never trusted on its own.
 * Refuses when no agent URL is configured yet (setConfig requires one); that
 * state only ever offers a read-only readout in the widget anyway.
 */
export async function setAgentEnabled(
  enabled: boolean,
): Promise<SetAgentEnabledState> {
  const gate = await authorize("settings.write");
  if (!gate.ok) return { status: "error", error: gate.reason };

  const current = getConfig().agent;
  if (!current.url) {
    return { status: "error", error: "No agent URL is configured yet." };
  }

  try {
    setConfig({ agent: { url: current.url, enabled } });
  } catch (err) {
    return {
      status: "error",
      error: err instanceof ConfigError ? err.message : "Couldn't update the agent.",
    };
  }

  await audit(gate.session, {
    action: enabled ? "agent.enable" : "agent.disable",
    targetType: "config",
    targetName: "agent",
  });
  revalidatePath(PATH);
  return { status: "success", enabled };
}
