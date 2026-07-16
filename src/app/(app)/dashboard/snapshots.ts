/**
 * Dashboard snapshot history (server-only helper, NOT a Server Action).
 *
 * This is deliberately a plain server module, not a `"use server"` export: it is
 * only ever called from the dashboard Server Component during render, with the
 * tailnet counts it just read from Headscale on the server. Exposing it as a
 * Server Action would make it a public POST endpoint that any authenticated
 * caller (including a read-only role) could invoke with fabricated counts,
 * poisoning the shared "online over time" series. Keeping it a normal function
 * means the only counts that reach {@link recordSnapshotThrottled} are the
 * server-derived, trusted ones.
 *
 * SERVER-ONLY by importing `@/lib/db/snapshots` (`node:sqlite`).
 */

import { listSnapshots, recordSnapshotThrottled } from "@/lib/db/snapshots";

/** A snapshot projected for charts: epoch-ms `ts` plus the three counts. */
export interface SnapshotPoint {
  ts: number;
  total: number;
  online: number;
  users: number;
}

/** How far back the returned history reaches. */
const HISTORY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Record the current (server-computed) tailnet counts, throttled, and return the
 * recent history oldest-first for the trend chart. Never throws: on any error
 * the history comes back empty and the caller degrades to "not enough data yet".
 */
export async function captureTailnetSnapshot(input: {
  total: number;
  online: number;
  users: number;
}): Promise<SnapshotPoint[]> {
  try {
    await recordSnapshotThrottled(input);
    const rows = await listSnapshots({
      sinceMs: Date.now() - HISTORY_WINDOW_MS,
      limit: 1000,
    });
    return rows.map((row) => ({
      ts: row.ts.getTime(),
      total: row.total,
      online: row.online,
      users: row.users,
    }));
  } catch {
    return [];
  }
}
