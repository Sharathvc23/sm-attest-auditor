"use client";

import { ChainNode } from "./chain-node";
import { cn } from "./lib/utils";
import type { ChainStep } from "./types";

/**
 * ChainView — ordered list of `ChainStep` nodes assembled from a
 * chain-walk. Substrate-neutral: takes a pre-computed `ChainStep[]`
 * (see `audit-logic.ts:buildChainWalk`).
 *
 * Direction is the caller's responsibility — pass a chronological array
 * for a forward-from-genesis view, or a reversed array for a
 * reverse-from-checkpoint view. The component does not re-order.
 */
export function ChainView({
  steps,
  className,
}: {
  steps: readonly ChainStep[];
  className?: string;
}) {
  if (steps.length === 0) {
    return (
      <p
        data-testid="chain-view-empty"
        className={cn("text-muted-foreground font-mono text-[11px]", className)}
      >
        No chain to display.
      </p>
    );
  }
  return (
    <ol
      data-testid="chain-view"
      className={cn("space-y-2", className)}
    >
      {steps.map((s) => (
        <ChainNode key={`${s.envelope.id}-${s.index}`} step={s} />
      ))}
    </ol>
  );
}
