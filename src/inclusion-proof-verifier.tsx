"use client";

import { useState } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { cn } from "./lib/utils";
import { shortHash, verifyMerkleInclusion } from "./audit-logic";
import type { InclusionProofResult, MerkleInclusionProof } from "./types";

type State =
  | { status: "idle" }
  | { status: "verifying" }
  | { status: "done"; result: InclusionProofResult };

/**
 * InclusionProofVerifier — interactive RFC 6962 merkle proof verifier.
 *
 * Substrate-neutral: takes a pre-fetched `MerkleInclusionProof` as a
 * prop. The verifier triggers the SHA-256 walk on click and surfaces
 * the result inline. No network calls.
 *
 * Output:
 *
 *   - On success: green check + "Inclusion verified" + the computed root
 *     truncated to a short hash.
 *   - On failure: red x + the failure reason + the computed root for
 *     comparison against the expected root.
 *
 * The component is controlled-friendly: pass `onResult` to receive the
 * `InclusionProofResult` for downstream wiring (e.g., automatic chain
 * unlocking once the proof verifies).
 */
export function InclusionProofVerifier({
  proof,
  onResult,
  className,
  buttonLabel = "Verify inclusion",
}: {
  proof: MerkleInclusionProof;
  onResult?: (result: InclusionProofResult) => void;
  className?: string;
  buttonLabel?: string;
}) {
  const [state, setState] = useState<State>({ status: "idle" });

  async function run() {
    setState({ status: "verifying" });
    const result = await verifyMerkleInclusion(proof);
    setState({ status: "done", result });
    onResult?.(result);
  }

  return (
    <div
      data-testid="inclusion-proof-verifier"
      data-state={state.status}
      className={cn("flex flex-col gap-2", className)}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          onClick={run}
          disabled={state.status === "verifying"}
          data-testid="verify-inclusion-button"
        >
          {state.status === "verifying" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : null}
          {buttonLabel}
        </Button>
        <span className="text-muted-foreground font-mono text-[10px]">
          leaf <code className="text-foreground">{shortHash(proof.leafHash)}</code>
          {" • "}
          {proof.siblings.length} sibling{proof.siblings.length === 1 ? "" : "s"}
        </span>
      </div>
      {state.status === "done" ? (
        <Result result={state.result} />
      ) : null}
    </div>
  );
}

function Result({ result }: { result: InclusionProofResult }) {
  if (result.ok) {
    return (
      <div
        data-testid="inclusion-result-ok"
        className="flex flex-wrap items-center gap-2 font-mono text-[11px]"
      >
        <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
        <span>Inclusion verified.</span>
        <Badge variant="outline" className="font-mono text-[9px] uppercase">
          root match
        </Badge>
        <code className="text-muted-foreground">{shortHash(result.computedRoot)}</code>
      </div>
    );
  }
  return (
    <div
      data-testid="inclusion-result-fail"
      className="flex flex-wrap items-center gap-2 font-mono text-[11px]"
    >
      <X className="text-destructive h-3 w-3" />
      <span className="text-destructive">Inclusion failed: {result.reason ?? "unknown"}</span>
      <code className="text-muted-foreground">computed {shortHash(result.computedRoot)}</code>
    </div>
  );
}
