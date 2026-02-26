import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { ResetPasswordForm } from "./reset-password-form";

vi.mock("react", async (importActual) => ({
  ...(await importActual<typeof import("react")>()),
  useActionState: vi.fn(),
}));

vi.mock("../actions", () => ({
  resetPasswordAction: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn().mockReturnValue({ push: vi.fn() }),
  useSearchParams: vi.fn().mockReturnValue(new URLSearchParams("token=test-token")),
}));

beforeEach(() => {
  vi.mocked(useActionState).mockReturnValue([{}, vi.fn(), false]);
  vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams("token=test-token") as ReturnType<typeof useSearchParams>);
});

describe("ResetPasswordForm", () => {
  it("shows Invalid Link card when no token in URL", () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams("") as ReturnType<typeof useSearchParams>);

    render(<ResetPasswordForm />);

    expect(screen.getByText("Invalid Link")).toBeInTheDocument();
    expect(screen.queryByLabelText("New Password")).not.toBeInTheDocument();
  });

  it("renders password and confirmPassword inputs when token is present", () => {
    render(<ResetPasswordForm />);

    expect(screen.getByLabelText("New Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm New Password")).toBeInTheDocument();
  });

  it("shows error banner when state.error is set", () => {
    vi.mocked(useActionState).mockReturnValue([
      { error: "This link has expired. Please request a new one." },
      vi.fn(),
      false,
    ]);

    render(<ResetPasswordForm />);

    expect(
      screen.getByText("This link has expired. Please request a new one.")
    ).toBeInTheDocument();
  });

  it("shows success banner when state.success is set", () => {
    vi.mocked(useActionState).mockReturnValue([
      { success: "Password reset successfully! Redirecting to sign in..." },
      vi.fn(),
      false,
    ]);

    render(<ResetPasswordForm />);

    expect(
      screen.getByText("Password reset successfully! Redirecting to sign in...")
    ).toBeInTheDocument();
  });

  it("shows field error under password input", () => {
    vi.mocked(useActionState).mockReturnValue([
      { fieldErrors: { password: "Password must be at least 8 characters" } },
      vi.fn(),
      false,
    ]);

    render(<ResetPasswordForm />);

    expect(
      screen.getByText("Password must be at least 8 characters")
    ).toBeInTheDocument();
  });

  it("shows field error under confirmPassword input", () => {
    vi.mocked(useActionState).mockReturnValue([
      { fieldErrors: { confirmPassword: "Passwords don't match" } },
      vi.fn(),
      false,
    ]);

    render(<ResetPasswordForm />);

    expect(screen.getByText("Passwords don't match")).toBeInTheDocument();
  });

  it("disables submit button and shows spinner when isPending is true", () => {
    vi.mocked(useActionState).mockReturnValue([{}, vi.fn(), true]);

    render(<ResetPasswordForm />);

    expect(
      screen.getByRole("button", { name: /reset password/i })
    ).toBeDisabled();
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });
});
