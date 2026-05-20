import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChainView } from "../src/chain-view";
import { buildChainWalk } from "../src/audit-logic";
import { makeEnvelope } from "./helpers/make-envelope";

describe("ChainView", () => {
  it("renders the empty marker when no steps are supplied", () => {
    render(<ChainView steps={[]} />);
    expect(screen.getByTestId("chain-view-empty")).toBeInTheDocument();
  });

  it("renders one ChainNode per step", () => {
    const a = makeEnvelope({ id: "a", envelope_hash: "AA" });
    const b = makeEnvelope({ id: "b", envelope_hash: "BB", predecessor_hash: "AA" });
    const steps = buildChainWalk([a, b], "BB");
    render(<ChainView steps={steps} />);
    expect(screen.getByTestId("chain-node-a")).toBeInTheDocument();
    expect(screen.getByTestId("chain-node-b")).toBeInTheDocument();
  });

  it("surfaces broken chain links visually", () => {
    const orphan = makeEnvelope({ id: "orphan", envelope_hash: "OO", predecessor_hash: "MISSING" });
    const steps = buildChainWalk([orphan], "OO");
    render(<ChainView steps={steps} />);
    expect(screen.getByTestId("chain-node-broken-orphan")).toBeInTheDocument();
    expect(screen.getByTestId("chain-node-orphan").dataset.linkIntact).toBe("false");
  });

  it("propagates the envelope kind to a data attribute", () => {
    const dec = makeEnvelope({ id: "d", type: "decision", envelope_hash: "DD" });
    const steps = buildChainWalk([dec], "DD");
    render(<ChainView steps={steps} />);
    expect(screen.getByTestId("chain-node-d").dataset.envelopeKind).toBe("decision");
  });
});
