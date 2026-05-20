"use client";

import { Badge } from "./ui/badge";
import { cn } from "./lib/utils";
import { shortHash } from "./audit-logic";
import type { ChainStep } from "./types";

const KIND_TONE: Record<string, string> = {
  action: "bg-transparent text-muted-foreground",
  decision: "bg-violet-50 text-violet-900 dark:bg-violet-950 dark:text-violet-200",
  belief: "bg-teal-50 text-teal-900 dark:bg-teal-950 dark:text-teal-200",
  checkpoint: "bg-rose-50 text-rose-900 dark:bg-rose-950 dark:text-rose-200",
};

const NEUTRAL_TONE = "bg-transparent text-muted-foreground";

function kindTone(label: unknown): string {
  if (typeof label !== "string") return NEUTRAL_TONE;
  return Object.hasOwn(KIND_TONE, label) ? KIND_TONE[label] : NEUTRAL_TONE;
}

/**
 * ChainNode — single envelope in a chain-walk view.
 *
 * Renders at-a-glance:
 *   - Envelope-kind badge (matches sm-attest-viewer's kind tones).
 *   - Truncated envelope hash + predecessor hash.
 *   - Chain-link integrity indicator (green check / amber warning) — when
 *     `linkIntact === false`, the chain is broken at this node and an
 *     auditor should treat the upstream history as untrusted.
 *   - Step index ("3 / 12") in the chain.
 */
export function ChainNode({
  step,
  className,
}: {
  step: ChainStep;
  className?: string;
}) {
  const tone = kindTone(step.envelope.type);
  return (
    <li
      data-testid={`chain-node-${step.envelope.id}`}
      data-link-intact={step.linkIntact ? "true" : "false"}
      data-envelope-kind={step.envelope.type}
      className={cn(
        "bg-card grid grid-cols-[auto_1fr_auto] items-start gap-3 rounded-sm border-l-2 px-3 py-2 text-[12px]",
        step.linkIntact ? "border-l-emerald-500" : "border-l-amber-500",
        className,
      )}
    >
      <Badge
        variant="outline"
        className={cn("border-transparent font-mono text-[9px] uppercase", tone)}
      >
        {String(step.envelope.type)}
      </Badge>
      <div className="min-w-0 space-y-0.5">
        <div className="text-muted-foreground font-mono text-[10px]">
          hash <code className="text-foreground">{shortHash(step.hash)}</code>
        </div>
        <div className="text-muted-foreground font-mono text-[10px]">
          predecessor <code className="text-foreground">{shortHash(step.predecessorHash)}</code>
        </div>
        {!step.linkIntact ? (
          <p
            data-testid={`chain-node-broken-${step.envelope.id}`}
            className="text-amber-700 dark:text-amber-300 font-mono text-[10px]"
          >
            Chain link is broken at this node — upstream history is not verifiable.
          </p>
        ) : null}
      </div>
      <span
        className="text-muted-foreground shrink-0 font-mono text-[10px] tabular-nums"
        aria-label="step"
      >
        {step.index + 1} / {step.total}
      </span>
    </li>
  );
}
