import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SignOutButton } from "./sign-out-button";

// Mock the server action
vi.mock("@/components/auth/actions", () => ({
  signOutAction: vi.fn(),
}));

describe("SignOutButton", () => {
  it("renders a sign out button", () => {
    render(<SignOutButton />);
    expect(
      screen.getByRole("button", { name: /sign out/i })
    ).toBeInTheDocument();
  });

  it("renders as a form with submit button", () => {
    render(<SignOutButton />);
    const button = screen.getByRole("button", { name: /sign out/i });
    expect(button).toHaveAttribute("type", "submit");
    expect(button.closest("form")).toBeInTheDocument();
  });
});
