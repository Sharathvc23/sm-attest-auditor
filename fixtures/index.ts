/**
 * Golden audit fixtures.
 *
 * Three shape examples for the bidirectional drill:
 *
 *   - `chainThree` — a 3-envelope chain (action → decision → belief),
 *     each with `envelope_hash` and `predecessor_hash` populated.
 *   - `checkpointOne` — a checkpoint envelope committing to a 3-envelope
 *     scope under RFC 6962 SHA-256.
 *
 * Import them in your tests, or use them as wire-format references when
 * implementing an audit feed.
 *
 * Fixture hashes use placeholder bytes — they do NOT verify against real
 * canonicalization. Treat them as shape examples, not as proof artifacts.
 */

import chainThreeRaw from "./chain-3-envelopes.json" with { type: "json" };
import checkpointOneRaw from "./checkpoint-1.json" with { type: "json" };

import type { AuditableEnvelope, CheckpointEnvelope } from "../src/types";

export const auditFixtures = {
  /** 3-envelope chain: action → decision → belief. */
  chainThree: chainThreeRaw as unknown as AuditableEnvelope[],
  /** Tenant-scope checkpoint committing to the chainThree set. */
  checkpointOne: checkpointOneRaw as unknown as CheckpointEnvelope,
} as const;

export type AuditFixtureKey = keyof typeof auditFixtures;
