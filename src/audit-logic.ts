/**
 * Pure audit derivation for the Attest Auditor.
 *
 * All functions here are pure and exported for unit testing. Component
 * code never inlines derivation in JSX.
 *
 * Two derivation surfaces:
 *
 *   1. Forward chain-walk — given a set of envelopes and a starting hash,
 *      assemble the chain by following `predecessor_hash` pointers.
 *
 *   2. Reverse merkle inclusion — given a leaf hash, a sibling path, and
 *      an expected root, verify the leaf is committed under the root
 *      per RFC 6962 §2.1.1 hashing rules.
 */

import type {
  AuditableEnvelope,
  ChainStep,
  InclusionProofResult,
  MerkleInclusionProof,
} from "./types";

/**
 * Determine an envelope's hash for chain-walk purposes. Prefers the
 * `envelope_hash` field when supplied by the substrate; otherwise
 * returns null and lets the caller decide how to derive it (typically
 * via a separate canonicalize+hash step the consumer wires in).
 */
export function envelopeHashOf(envelope: AuditableEnvelope): string | null {
  return typeof envelope.envelope_hash === "string" && envelope.envelope_hash.trim() !== ""
    ? envelope.envelope_hash
    : null;
}

/**
 * Build an ordered chain-walk view from a set of envelopes and a starting
 * hash. Direction:
 *
 *   - `forward`  — walks newest → oldest by following `predecessor_hash`.
 *                  Returns steps in chronological (genesis-first) order.
 *   - `reverse`  — same traversal, returned in reverse-chronological order
 *                  so a checkpoint-anchored drill renders newest first.
 *
 * Cycles are detected and broken (the walk halts at the first repeated
 * envelope hash). Missing predecessors halt the walk gracefully — the
 * returned steps reflect what could be assembled, no exceptions thrown.
 *
 * `linkIntact` is true when an envelope's predecessor is present in the
 * chain AND that predecessor's hash matches the envelope's
 * `predecessor_hash`. The genesis envelope (no predecessor) has
 * `linkIntact: true` by definition.
 */
export function buildChainWalk(
  envelopes: readonly AuditableEnvelope[],
  startHash: string,
  direction: "forward" | "reverse" = "forward",
): ChainStep[] {
  const byHash = new Map<string, AuditableEnvelope>();
  for (const env of envelopes) {
    const h = envelopeHashOf(env);
    if (h) byHash.set(h, env);
  }

  const collected: AuditableEnvelope[] = [];
  const seen = new Set<string>();
  let cursor: string | null = startHash;
  while (cursor && !seen.has(cursor)) {
    seen.add(cursor);
    const env = byHash.get(cursor);
    if (!env) break;
    collected.push(env);
    cursor =
      typeof env.predecessor_hash === "string" && env.predecessor_hash.trim() !== ""
        ? env.predecessor_hash
        : null;
  }

  // collected is newest-first; reverse to chronological order for forward view.
  const chronological = [...collected].reverse();
  const total = chronological.length;
  const steps: ChainStep[] = chronological.map((envelope, index) => {
    const hash = envelopeHashOf(envelope);
    const predHash =
      typeof envelope.predecessor_hash === "string" && envelope.predecessor_hash.trim() !== ""
        ? envelope.predecessor_hash
        : null;
    const prev = index > 0 ? chronological[index - 1] : null;
    const prevHash = prev ? envelopeHashOf(prev) : null;
    const linkIntact = predHash === null ? index === 0 : prevHash !== null && predHash === prevHash;
    return { envelope, index, total, hash, predecessorHash: predHash, linkIntact };
  });

  return direction === "forward" ? steps : [...steps].reverse();
}

/**
 * Async SHA-256 over a UTF-8 string. Uses Web Crypto's `crypto.subtle`,
 * available in modern browsers, Node.js 20+, and the test environment.
 * Returns a lowercase hex string.
 */
export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const view = new Uint8Array(digest);
  let out = "";
  for (let i = 0; i < view.length; i++) {
    out += view[i].toString(16).padStart(2, "0");
  }
  return out;
}

/** Concatenate two hex strings as raw bytes and SHA-256 them. */
async function sha256HexPair(leftHex: string, rightHex: string): Promise<string> {
  const left = hexToBytes(leftHex);
  const right = hexToBytes(rightHex);
  const concat = new Uint8Array(left.length + right.length);
  concat.set(left, 0);
  concat.set(right, left.length);
  const digest = await crypto.subtle.digest("SHA-256", concat);
  return bytesToHex(new Uint8Array(digest));
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/, "");
  if (clean.length % 2 !== 0) throw new Error("invalid hex length");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}

/**
 * Verify a merkle inclusion proof per RFC 6962 §2.1.1. The caller supplies:
 *
 *   - `leafHash`     — SHA-256 of the leaf data (or RFC 6962 leaf-prefixed
 *                       hash; the auditor treats it as opaque pre-hashed bytes).
 *   - `siblings`     — sibling hashes from leaf to root, each tagged with
 *                       whether the sibling sits LEFT or RIGHT of the running hash.
 *   - `expectedRoot` — the merkle root the proof should resolve to.
 *
 * Returns `{ ok, computedRoot, steps, reason }`. On success
 * `computedRoot === expectedRoot` and `ok === true`. On failure the
 * `reason` field carries a short diagnostic.
 */
export async function verifyMerkleInclusion(
  proof: MerkleInclusionProof,
): Promise<InclusionProofResult> {
  const { leafHash, siblings, expectedRoot } = proof;
  if (!leafHash || leafHash.trim() === "") {
    return { ok: false, computedRoot: "", steps: 0, reason: "leaf-empty" };
  }
  if (!expectedRoot || expectedRoot.trim() === "") {
    return { ok: false, computedRoot: "", steps: 0, reason: "expected-root-empty" };
  }
  let running = leafHash.toLowerCase();
  for (const step of siblings) {
    const sibling = step.hash.toLowerCase();
    running =
      step.position === "left"
        ? await sha256HexPair(sibling, running)
        : await sha256HexPair(running, sibling);
  }
  const computedRoot = running;
  if (computedRoot !== expectedRoot.toLowerCase()) {
    return {
      ok: false,
      computedRoot,
      steps: siblings.length,
      reason: "computed-root-mismatch",
    };
  }
  return { ok: true, computedRoot, steps: siblings.length };
}

/**
 * Format a short hash label for display ("a1b2c3…f9e8d7").
 *
 * Defensive: returns "—" for empty/missing input so the UI doesn't show
 * a stray ellipsis.
 */
export function shortHash(hash: string | null | undefined): string {
  if (typeof hash !== "string" || hash.trim() === "") return "—";
  const clean = hash.replace(/^0x/, "");
  if (clean.length <= 12) return clean;
  return `${clean.slice(0, 6)}…${clean.slice(-6)}`;
}
