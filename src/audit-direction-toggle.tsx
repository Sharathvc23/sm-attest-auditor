"use client";

import { Button } from "./ui/button";
import { cn } from "./lib/utils";
import type { AuditDirection } from "./types";

/**
 * AuditDirectionToggle — bidirectional drill switch.
 *
 * Two-state toggle between forward (chain-walk from genesis) and reverse
 * (merkle drill from checkpoint) audit modes. Controlled; the parent
 * owns the current direction and gets notified on change.
 */
export function AuditDirectionToggle({
  direction,
  onChange,
  className,
}: {
  direction: AuditDirection;
  onChange: (direction: AuditDirection) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      data-testid="audit-direction-toggle"
      data-direction={direction}
      className={cn("inline-flex items-center gap-1", className)}
    >
      <Button
        type="button"
        size="xs"
        variant={direction === "forward" ? "default" : "outline"}
        data-testid="audit-direction-forward"
        aria-pressed={direction === "forward"}
        onClick={() => onChange("forward")}
      >
        Forward
      </Button>
      <Button
        type="button"
        size="xs"
        variant={direction === "reverse" ? "default" : "outline"}
        data-testid="audit-direction-reverse"
        aria-pressed={direction === "reverse"}
        onClick={() => onChange("reverse")}
      >
        Reverse
      </Button>
    </div>
  );
}
