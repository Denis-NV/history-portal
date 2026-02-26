import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { useActionState } from "react";
import { SignInForm } from "./sign-in-form";

vi.mock("react", async (importActual) => ({
  ...(await importActual<typeof import("react")>()),
  useActionState: vi.fn(),
}));

vi.mock("../actions", () => ({
  signInAction: vi.fn(),
}));

vi.mock("@/lib/auth/client", () => ({
  signIn: { social: vi.fn() },
}));

beforeEach(() => {
  vi.mocked(useActionState).mockReturnValue([{}, vi.fn(), false]);
});

describe("SignInForm", () => {
  it("renders email and password inputs in default state", () => {
    render(<SignInForm />);

    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("shows error banner when state.error is set", () => {
    vi.mocked(useActionState).mockReturnValue([
      { error: "Invalid email or password." },
      vi.fn(),
      false,
    ]);

    render(<SignInForm />);

    expect(screen.getByText("Invalid email or password.")).toBeInTheDocument();
  });

  it("shows field error under email input", () => {
    vi.mocked(useActionState).mockReturnValue([
      { fieldErrors: { email: "Please enter a valid email address" } },
      vi.fn(),
      false,
    ]);

    render(<SignInForm />);

    expect(
      screen.getByText("Please enter a valid email address")
    ).toBeInTheDocument();
  });

  it("shows field error under password input", () => {
    vi.mocked(useActionState).mockReturnValue([
      { fieldErrors: { password: "Password is required" } },
      vi.fn(),
      false,
    ]);

    render(<SignInForm />);

    expect(screen.getByText("Password is required")).toBeInTheDocument();
  });

  it("restores email input from state.values", () => {
    vi.mocked(useActionState).mockReturnValue([
      { values: { email: "alice@example.com" } },
      vi.fn(),
      false,
    ]);

    render(<SignInForm />);

    expect(screen.getByLabelText("Email")).toHaveValue("alice@example.com");
  });

  it("disables submit button and shows spinner when isPending is true", () => {
    vi.mocked(useActionState).mockReturnValue([{}, vi.fn(), true]);

    render(<SignInForm />);

    expect(screen.getByRole("button", { name: /sign in/i })).toBeDisabled();
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });
});
