import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { useActionState } from "react";
import { ForgotPasswordForm } from "./forgot-password-form";

vi.mock("react", async (importActual) => ({
  ...(await importActual<typeof import("react")>()),
  useActionState: vi.fn(),
}));

vi.mock("../actions", () => ({
  forgotPasswordAction: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(useActionState).mockReturnValue([{}, vi.fn(), false]);
});

describe("ForgotPasswordForm", () => {
  it("renders email input in default state", () => {
    render(<ForgotPasswordForm />);

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("shows success banner when state.success is set", () => {
    vi.mocked(useActionState).mockReturnValue([
      {
        success:
          "If an account exists with this email, you will receive a password reset link.",
      },
      vi.fn(),
      false,
    ]);

    render(<ForgotPasswordForm />);

    expect(
      screen.getByText(
        "If an account exists with this email, you will receive a password reset link."
      )
    ).toBeInTheDocument();
  });

  it("shows error banner when state.error is set", () => {
    vi.mocked(useActionState).mockReturnValue([
      { error: "Something went wrong. Please try again." },
      vi.fn(),
      false,
    ]);

    render(<ForgotPasswordForm />);

    expect(
      screen.getByText("Something went wrong. Please try again.")
    ).toBeInTheDocument();
  });

  it("shows field error under email input", () => {
    vi.mocked(useActionState).mockReturnValue([
      { fieldErrors: { email: "Please enter a valid email address" } },
      vi.fn(),
      false,
    ]);

    render(<ForgotPasswordForm />);

    expect(
      screen.getByText("Please enter a valid email address")
    ).toBeInTheDocument();
  });

  it("restores email input from state.values", () => {
    vi.mocked(useActionState).mockReturnValue([
      { values: { email: "alice@example.com" } },
      vi.fn(),
      false,
    ]);

    render(<ForgotPasswordForm />);

    expect(screen.getByLabelText("Email")).toHaveValue("alice@example.com");
  });

  it("disables submit button and shows spinner when isPending is true", () => {
    vi.mocked(useActionState).mockReturnValue([{}, vi.fn(), true]);

    render(<ForgotPasswordForm />);

    expect(
      screen.getByRole("button", { name: /send reset link/i })
    ).toBeDisabled();
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });
});
