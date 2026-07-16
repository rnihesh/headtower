/**
 * Agent access-token minting (server-only).
 *
 * One place that builds the signed token envelope the Go agent verifies (see
 * `agent/ssh.go` `verifyToken`), so the wire format has a single TypeScript
 * implementation instead of being hand-rolled at each call site:
 *
 *   base64url(payloadJSON) + "." + base64url(HMAC_SHA256(payloadJSON, secret))
 *
 * Both segments are UNPADDED base64url (Node's `"base64url"` buffer encoding
 * already omits padding, matching Go's `base64.RawURLEncoding`). The HMAC covers
 * the exact payload bytes that were encoded into the first segment. Callers own
 * the payload shape - `{host, user, exp}` for an `/ssh` terminal token,
 * `{aud: "peers", exp}` for a `/peers` read token - which is what makes the two
 * token kinds non-interchangeable on the agent side.
 *
 * SERVER-ONLY: uses `node:crypto` and the shared SSH secret; never import into a
 * client component.
 */

import { createHmac } from "node:crypto";

/** Sign `payload` into the agent's token envelope with the shared HMAC secret. */
export function mintAgentToken(
  secret: string,
  payload: Record<string, unknown>,
): string {
  const payloadBytes = Buffer.from(JSON.stringify(payload), "utf8");
  const signature = createHmac("sha256", secret).update(payloadBytes).digest();
  return `${payloadBytes.toString("base64url")}.${signature.toString("base64url")}`;
}
