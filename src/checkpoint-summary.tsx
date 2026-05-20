"use client";

import { Badge } from "./ui/badge";
import { cn } from "./lib/utils";
import { shortHash } from "./audit-logic";
import type { CheckpointEnvelope } from "./types";

/**
 * CheckpointSummary — header card for a checkpoint envelope.
 *
 * Surfaces the merkle commitment metadata an auditor needs before
 * running a reverse drill:
 *
 *   - scope + scope_key (what slice of envelopes the commitment covers).
 *   - as_of_ts (when the snapshot was taken).
 *   - covered_envelopes_count (how many leaves the merkle root commits to).
 *   - merkle_root + inclusion-proof method (the verification target).
 *
 * Defensive: missing fields render with em-dashes rather than crashing.
 */
export function CheckpointSummary({
  envelope,
  className,
}: {
  envelope: CheckpointEnvelope;
  className?: string;
}) {
  const subject = envelope.payload?.checkpoint_subject;
  const root = typeof envelope.payload?.merkle_root === "string" ? envelope.payload.merkle_root : null;
  const method = typeof envelope.payload?.merkle_inclusion_proof_method === "string"
    ? envelope.payload.merkle_inclusion_proof_method
    : null;
  const count = typeof subject?.covered_envelopes_count === "number"
    ? subject.covered_envelopes_count
    : null;
  const scope = subject?.scope ?? "—";
  const scopeKey = subject?.scope_key ?? "—";
  const asOf = subject?.as_of_ts ?? "—";

  return (
    <section
      data-testid={`checkpoint-summary-${envelope.id}`}
      data-scope={String(scope)}
      className={cn(
        "bg-card grid gap-2 rounded-sm border-l-2 border-l-rose-500 px-3 py-2 text-[12px]",
        className,
      )}
    >
      <header className="flex flex-wrap items-center gap-1.5">
        <Badge
          variant="outline"
          className="border-transparent bg-rose-50 text-rose-900 dark:bg-rose-950 dark:text-rose-200 font-mono text-[9px] uppercase"
        >
          checkpoint
        </Badge>
        <Badge variant="outline" className="font-mono text-[9px] uppercase">
          {String(scope)}
        </Badge>
        {method ? (
          <Badge variant="outline" className="font-mono text-[9px] uppercase">
            {method}
          </Badge>
        ) : null}
      </header>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[11px] font-mono">
        <dt className="text-muted-foreground">scope_key</dt>
        <dd className="truncate">{String(scopeKey)}</dd>
        <dt className="text-muted-foreground">as_of_ts</dt>
        <dd className="tabular-nums">{String(asOf)}</dd>
        <dt className="text-muted-foreground">covered</dt>
        <dd className="tabular-nums">
          {count === null ? "—" : `${count} envelope${count === 1 ? "" : "s"}`}
        </dd>
        <dt className="text-muted-foreground">merkle_root</dt>
        <dd data-testid="checkpoint-merkle-root">
          <code className="text-foreground">{shortHash(root)}</code>
        </dd>
      </dl>
    </section>
  );
}
