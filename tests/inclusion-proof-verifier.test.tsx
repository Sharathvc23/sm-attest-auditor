import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InclusionProofVerifier } from "../src/inclusion-proof-verifier";
import { sha256Hex } from "../src/audit-logic";

describe("InclusionProofVerifier", () => {
  it("renders idle with leaf preview before verification", () => {
    render(
      <InclusionProofVerifier
        proof={{ leafHash: "AA", siblings: [], expectedRoot: "BB" }}
      />,
    );
    expect(screen.getByTestId("inclusion-proof-verifier").dataset.state).toBe("idle");
    expect(screen.getByTestId("verify-inclusion-button")).toBeInTheDocument();
  });

  it("reports success when leaf == root for a no-sibling proof", async () => {
    const leaf = await sha256Hex("ok-leaf");
    const onResult = vi.fn();
    const user = userEvent.setup();
    render(
      <InclusionProofVerifier
        proof={{ leafHash: leaf, siblings: [], expectedRoot: leaf }}
        onResult={onResult}
      />,
    );
    await user.click(screen.getByTestId("verify-inclusion-button"));
    expect(await screen.findByTestId("inclusion-result-ok")).toBeInTheDocument();
    expect(onResult).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
  });

  it("reports failure when the expected root is wrong", async () => {
    const leaf = await sha256Hex("bad-root");
    const user = userEvent.setup();
    render(
      <InclusionProofVerifier
        proof={{ leafHash: leaf, siblings: [], expectedRoot: "ffff" }}
      />,
    );
    await user.click(screen.getByTestId("verify-inclusion-button"));
    expect(await screen.findByTestId("inclusion-result-fail")).toBeInTheDocument();
    expect(screen.getByText(/computed-root-mismatch/i)).toBeInTheDocument();
  });
});
