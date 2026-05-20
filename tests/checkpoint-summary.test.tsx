import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CheckpointSummary } from "../src/checkpoint-summary";
import { auditFixtures } from "../fixtures/index";

describe("CheckpointSummary", () => {
  it("renders the merkle root, scope, and covered count from the fixture", () => {
    render(<CheckpointSummary envelope={auditFixtures.checkpointOne} />);
    expect(
      screen.getByTestId(`checkpoint-summary-${auditFixtures.checkpointOne.id}`),
    ).toBeInTheDocument();
    expect(screen.getByTestId("checkpoint-merkle-root")).toBeInTheDocument();
    expect(screen.getByText(/3 envelopes/i)).toBeInTheDocument();
  });

  it("does not crash when checkpoint_subject is missing", () => {
    const broken = {
      ...auditFixtures.checkpointOne,
      payload: {
        ...auditFixtures.checkpointOne.payload,
        checkpoint_subject: undefined,
      },
    } as unknown as typeof auditFixtures.checkpointOne;
    expect(() => render(<CheckpointSummary envelope={broken} />)).not.toThrow();
  });
});
