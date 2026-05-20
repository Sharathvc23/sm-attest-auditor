"use client";

import { useMemo, useState } from "react";
import { ChainView } from "./chain-view";
import { CheckpointSummary } from "./checkpoint-summary";
import { InclusionProofVerifier } from "./inclusion-proof-verifier";
import { AuditDirectionToggle } from "./audit-direction-toggle";
import { buildChainWalk } from "./audit-logic";
import type {
  AuditDirection,
  AuditableEnvelope,
  CheckpointEnvelope,
  ConnectionStatus,
  MerkleInclusionProof,
} from "./types";

const STATUS_TONE: Record<string, string> = {
  idle: "var(--gem-pending)",
  connecting: "var(--gem-pending)",
  open: "var(--gem-verified)",
  reconnecting: "var(--gem-warning)",
  closed: "var(--gem-pending)",
  error: "var(--gem-failed)",
};

/**
 * AttestAuditor — the pure-presentation root of `sm-attest-auditor`.
 *
 * Composes the chain-walk view, optional checkpoint summary, and merkle
 * inclusion verifier into a single bidirectional drill surface.
 *
 * SUBSTRATE-NEUTRAL. The consumer supplies envelopes + a starting hash
 * (and optionally a checkpoint + inclusion proof). The auditor never
 * opens connections, polls endpoints, or makes any network calls.
 *
 * Props:
 *
 *   - `envelopes` — pool of envelopes the chain-walk can traverse.
 *   - `startHash` — hash of the envelope to start the walk from.
 *   - `checkpoint` — optional `type: "checkpoint"` envelope used to
 *     anchor the reverse drill (and surface CheckpointSummary).
 *   - `inclusionProof` — optional `MerkleInclusionProof` rendered
 *     alongside the checkpoint. When present the InclusionProofVerifier
 *     button appears.
 *   - `status` — consumer's current connection state.
 *   - `initialDirection` — defaults to `"forward"`.
 *   - `title` — header text. Defaults to "Attest Auditor".
 */
export function AttestAuditor({
  envelopes,
  startHash,
  checkpoint,
  inclusionProof,
  status,
  initialDirection = "forward",
  title = "Attest Auditor",
}: {
  envelopes: AuditableEnvelope[];
  startHash: string;
  checkpoint?: CheckpointEnvelope;
  inclusionProof?: MerkleInclusionProof;
  status: ConnectionStatus;
  initialDirection?: AuditDirection;
  title?: string;
}) {
  const [direction, setDirection] = useState<AuditDirection>(initialDirection);

  const steps = useMemo(
    () => buildChainWalk(envelopes, startHash, direction),
    [envelopes, startHash, direction],
  );

  return (
    <div className="flex h-full flex-col" data-testid="attest-auditor">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="space-y-0.5">
          <h1 className="text-sm font-semibold">{title}</h1>
          <p className="text-muted-foreground font-mono text-[11px]">
            {steps.length} step{steps.length === 1 ? "" : "s"} • direction {direction}
          </p>
        </div>
        <span className="text-muted-foreground inline-flex items-center gap-1.5 text-[11px]">
          <span
            aria-hidden
            data-testid="auditor-status-dot"
            className="inline-block h-2 w-2 rounded-full"
            style={{
              background: Object.hasOwn(STATUS_TONE, status)
                ? STATUS_TONE[status]
                : STATUS_TONE.idle,
            }}
          />
          <span data-testid="auditor-status-label">{status}</span>
        </span>
      </header>
      <div className="min-h-0 flex-1 space-y-3 px-4 pb-4 pt-2">
        <AuditDirectionToggle direction={direction} onChange={setDirection} />
        {checkpoint ? <CheckpointSummary envelope={checkpoint} /> : null}
        {inclusionProof ? <InclusionProofVerifier proof={inclusionProof} /> : null}
        <ChainView steps={steps} />
      </div>
    </div>
  );
}
