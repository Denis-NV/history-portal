import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { useActionState } from "react";
import { SignUpForm } from "./sign-up-form";

vi.mock("react", async (importActual) => ({
  ...(await importActual<typeof import("react")>()),
  useActionState: vi.fn(),
}));

vi.mock("./actions", () => ({
  signUpAction: vi.fn(),
}));

vi.mock("@/lib/auth/client", () => ({
  signIn: { social: vi.fn() },
}));

beforeEach(() => {
  vi.mocked(useActionState).mockReturnValue([{}, vi.fn(), false]);
});

describe("SignUpForm", () => {
  it("renders all four inputs in default state", () => {
    render(<SignUpForm />);

    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm Password")).toBeInTheDocument();
  });

  it("shows success card and hides form when state.success is set", () => {
    vi.mocked(useActionState).mockReturnValue([
      { success: "Account created! Please check your email to verify your account." },
      vi.fn(),
      false,
    ]);

    render(<SignUpForm />);

    expect(screen.getByText("Check your email")).toBeInTheDocument();
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
  });

  it("shows error banner when state.error is set", () => {
    vi.mocked(useActionState).mockReturnValue([
      { error: "An account with this email already exists." },
      vi.fn(),
      false,
    ]);

    render(<SignUpForm />);

    expect(
      screen.getByText("An account with this email already exists.")
    ).toBeInTheDocument();
  });

  it("shows field error under name input", () => {
    vi.mocked(useActionState).mockReturnValue([
      { fieldErrors: { name: "Name must be at least 2 characters" } },
      vi.fn(),
      false,
    ]);

    render(<SignUpForm />);

    expect(
      screen.getByText("Name must be at least 2 characters")
    ).toBeInTheDocument();
  });

  it("shows field error under email input", () => {
    vi.mocked(useActionState).mockReturnValue([
      { fieldErrors: { email: "Please enter a valid email address" } },
      vi.fn(),
      false,
    ]);

    render(<SignUpForm />);

    expect(
      screen.getByText("Please enter a valid email address")
    ).toBeInTheDocument();
  });

  it("shows field error under password input", () => {
    vi.mocked(useActionState).mockReturnValue([
      { fieldErrors: { password: "Password must be at least 8 characters" } },
      vi.fn(),
      false,
    ]);

    render(<SignUpForm />);

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

    render(<SignUpForm />);

    expect(screen.getByText("Passwords don't match")).toBeInTheDocument();
  });

  it("restores name and email inputs from state.values", () => {
    vi.mocked(useActionState).mockReturnValue([
      { values: { name: "Alice Test", email: "alice@example.com" } },
      vi.fn(),
      false,
    ]);

    render(<SignUpForm />);

    expect(screen.getByLabelText("Name")).toHaveValue("Alice Test");
    expect(screen.getByLabelText("Email")).toHaveValue("alice@example.com");
  });

  it("disables submit button and shows spinner when isPending is true", () => {
    vi.mocked(useActionState).mockReturnValue([{}, vi.fn(), true]);

    render(<SignUpForm />);

    expect(
      screen.getByRole("button", { name: /create account/i })
    ).toBeDisabled();
    // Loader2 renders an svg with animate-spin class
    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
  });
});
