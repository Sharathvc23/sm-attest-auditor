/**
 * sm-attest-auditor — public API.
 *
 * Bidirectional drill for AAE envelope chains: forward chain-walk via
 * predecessor_hash, reverse merkle inclusion verification from a
 * checkpoint envelope. See README.md for usage and SPEC.md for the
 * audit semantics.
 */

export { AttestAuditor } from "./attest-auditor";
export { ChainView } from "./chain-view";
export { ChainNode } from "./chain-node";
export { CheckpointSummary } from "./checkpoint-summary";
export { InclusionProofVerifier } from "./inclusion-proof-verifier";
export { AuditDirectionToggle } from "./audit-direction-toggle";

export {
  buildChainWalk,
  envelopeHashOf,
  sha256Hex,
  shortHash,
  verifyMerkleInclusion,
} from "./audit-logic";

export {
  type AAEActor,
  type AAEClassification,
  type AAEEnvelopeKind,
  type AAELifecycle,
  type AuditableEnvelope,
  type AuditDirection,
  type ChainStep,
  type CheckpointEnvelope,
  type CheckpointSubject,
  type ConnectionStatus,
  type EnvelopeSubject,
  type InclusionProofResult,
  type MerkleInclusionProof,
  type TrustState,
} from "./types";

export { TooltipProvider } from "./ui/tooltip";
