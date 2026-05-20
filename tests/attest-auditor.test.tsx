import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AttestAuditor } from "../src/attest-auditor";
import { TooltipProvider } from "../src/ui/tooltip";
import { auditFixtures } from "../fixtures/index";

function renderAuditor(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

describe("AttestAuditor", () => {
  it("renders chain steps for the chain-3 fixture", () => {
    renderAuditor(
      <AttestAuditor
        envelopes={auditFixtures.chainThree}
        startHash="c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3"
        status="open"
      />,
    );
    expect(screen.getByTestId("attest-auditor")).toBeInTheDocument();
    expect(screen.getByTestId("chain-view")).toBeInTheDocument();
    expect(screen.getAllByTestId(/^chain-node-/)).toHaveLength(3);
  });

  it("renders checkpoint summary when a checkpoint envelope is supplied", () => {
    renderAuditor(
      <AttestAuditor
        envelopes={auditFixtures.chainThree}
        startHash="c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3"
        checkpoint={auditFixtures.checkpointOne}
        status="open"
      />,
    );
    expect(
      screen.getByTestId(`checkpoint-summary-${auditFixtures.checkpointOne.id}`),
    ).toBeInTheDocument();
  });

  it("toggles direction state when the toggle is clicked", async () => {
    const user = userEvent.setup();
    renderAuditor(
      <AttestAuditor
        envelopes={auditFixtures.chainThree}
        startHash="c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3"
        status="open"
      />,
    );
    expect(screen.getByTestId("audit-direction-toggle").dataset.direction).toBe("forward");
    await user.click(screen.getByTestId("audit-direction-reverse"));
    expect(screen.getByTestId("audit-direction-toggle").dataset.direction).toBe("reverse");
  });

  it("falls back to default status tone on an unknown status", () => {
    renderAuditor(
      <AttestAuditor
        envelopes={auditFixtures.chainThree}
        startHash="c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3"
        // @ts-expect-error — testing runtime defense
        status="unrecognized"
      />,
    );
    expect(screen.getByTestId("auditor-status-label")).toHaveTextContent("unrecognized");
  });
});
