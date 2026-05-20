/**
 * Attest-auditor — local types.
 *
 * Mirrors the AAE wire envelope and the checkpoint-envelope variant as
 * defined in the Attested Action Envelope specification (see SPEC.md
 * §3 and §5). The auditor is substrate-neutral: it accepts envelopes
 * shaped like `AuditableEnvelope` from any source — AG-UI streams, MCP
 * tool outputs, JSONL files, websockets, or a one-shot audit replay.
 */

export type AAEClassification = string;

export type AAELifecycle =
  | "proposed"
  | "signed"
  | "committed"
  | "anchored"
  | "reconciled";

export type AAEActor = {
  namespace: string;
  value: string;
  did: string | null;
  display_name?: string | null;
};

export type EnvelopeSubject = {
  namespace?: string;
  value?: string;
  did?: string | null;
};

/**
 * AAE envelope kinds per upstream SPEC §13. The auditor renders all four
 * along a single chain — chain-walks are kind-agnostic; merkle inclusion
 * proofs are checkpoint-bound.
 */
export type AAEEnvelopeKind = "action" | "decision" | "belief" | "checkpoint";

/** Trust state surfaced to operators per AAE SPEC §11.2. */
export type TrustState = "verified" | "warning" | "failed" | "pending";

/**
 * The minimal AAE envelope shape the auditor consumes. Fields beyond
 * those listed here are ignored. Per AAE SPEC §3, the envelope MUST
 * carry `v: 1`, `id`, `ts`, `tenant`, `actor`, `topic`, `type`,
 * `classification`, and `payload`.
 */
export type AuditableEnvelope = {
  v: 1;
  id: string;
  ts: string;
  tenant: string;
  actor: AAEActor;
  topic: string;
  type: AAEEnvelopeKind | (string & {});
  classification: AAEClassification;
  payload: Record<string, unknown>;
  lifecycle?: AAELifecycle;
  evidence_ref?: string;
  trace_id?: string;
  /**
   * Hash of the predecessor envelope. Forms a directed chain — each
   * envelope's `predecessor_hash` points at the prior envelope's
   * canonical hash. Omitted for the genesis envelope of a chain.
   */
  predecessor_hash?: string;
  /**
   * Canonical hash of THIS envelope (the hash that the next envelope's
   * `predecessor_hash` will point at). Optional on the wire — when
   * absent, callers compute it from the canonicalized envelope.
   */
  envelope_hash?: string;
};

/**
 * Subject of a checkpoint commitment — what slice of envelopes the
 * merkle root commits to. Per AAE SPEC §5 (planned § for the auditor).
 */
export type CheckpointSubject = {
  /** Scope of the commitment. */
  scope: "tenant" | "entity" | "agent" | "decision_chain" | (string & {});
  /** Identifier within the scope (e.g. the tenant ID, the entity DID). */
  scope_key: string;
  /** ISO 8601 timestamp the checkpoint was taken at. */
  as_of_ts: string;
  /** Count of envelopes covered by this checkpoint's merkle commitment. */
  covered_envelopes_count: number;
};

/**
 * A checkpoint envelope — `type: "checkpoint"` per upstream §13. The
 * payload carries a merkle commitment over the predecessor envelopes
 * in scope plus its inclusion-proof method identifier.
 */
export type CheckpointEnvelope = AuditableEnvelope & {
  type: "checkpoint";
  payload: {
    subject?: EnvelopeSubject;
    checkpoint_subject: CheckpointSubject;
    /** Hex-encoded SHA-256 merkle root over the predecessor envelopes. */
    merkle_root: string;
    /** Inclusion-proof method identifier. v0.1 supports RFC 6962 SHA-256. */
    merkle_inclusion_proof_method: "rfc6962-sha256" | (string & {});
    /**
     * Leaf hashes (predecessor envelope canonical hashes). Omitted when
     * the count exceeds a per-deployment threshold; consumers fetch the
     * leaves via a separate channel in that case.
     */
    predecessor_hashes?: string[];
    [k: string]: unknown;
  };
};

/**
 * A single audit step in a chain-walk view — one envelope's position in
 * the chain plus its derived display fields.
 */
export type ChainStep = {
  envelope: AuditableEnvelope;
  /** Zero-based position in the chain, with 0 = genesis. */
  index: number;
  /** Total number of steps in the chain. */
  total: number;
  /** Hash of this envelope (sourced from `envelope_hash` when present). */
  hash: string | null;
  /** Hash of the predecessor in the chain. */
  predecessorHash: string | null;
  /** True when the chain link is consistent (predecessor's hash matches). */
  linkIntact: boolean;
};

/**
 * A merkle inclusion proof per RFC 6962 §2.1.1.
 *
 * `leafHash` is the SHA-256 hash of the leaf envelope (the prefix-0x00
 * MTH treatment for leaves is the consumer's responsibility — this
 * library treats the supplied `leafHash` as already-hashed).
 *
 * `siblings` is the path of sibling hashes from leaf to root. Each
 * element carries its left/right position to disambiguate concatenation
 * order.
 */
export type MerkleInclusionProof = {
  leafHash: string;
  siblings: Array<{ hash: string; position: "left" | "right" }>;
  expectedRoot: string;
};

/** Result of verifying a `MerkleInclusionProof`. */
export type InclusionProofResult = {
  ok: boolean;
  computedRoot: string;
  /** Number of path steps walked. */
  steps: number;
  /** Reason on failure ("leaf-empty", "computed-root-mismatch", etc.). */
  reason?: string;
};

/** Direction of an audit drill — forward from genesis, or reverse from a checkpoint. */
export type AuditDirection = "forward" | "reverse";

export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "open"
  | "reconnecting"
  | "closed"
  | "error";
