import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuditDirectionToggle } from "../src/audit-direction-toggle";

describe("AuditDirectionToggle", () => {
  it("highlights the active direction via aria-pressed", () => {
    render(<AuditDirectionToggle direction="forward" onChange={vi.fn()} />);
    expect(screen.getByTestId("audit-direction-forward")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("audit-direction-reverse")).toHaveAttribute("aria-pressed", "false");
  });

  it("invokes onChange with the new direction on click", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<AuditDirectionToggle direction="forward" onChange={onChange} />);
    await user.click(screen.getByTestId("audit-direction-reverse"));
    expect(onChange).toHaveBeenCalledWith("reverse");
  });
});
