import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db, user } from "@/db";
import { TEST_USERS, TEST_PASSWORD } from "@/test-utils";
import { REDIRECT } from "@/const";
import {
  signUpAction,
  signInAction,
  forgotPasswordAction,
  resetPasswordAction,
} from "./actions";

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({}),
  cookies: vi.fn().mockResolvedValue({ set: vi.fn() }),
}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const { redirect } = await import("next/navigation");

const TEST_EMAIL = "integration-test@test.local";

afterEach(async () => {
  await db.delete(user).where(eq(user.email, TEST_EMAIL));
});

// ─────────────────────────────────────────────────────────────────────────────
// signUpAction
// ─────────────────────────────────────────────────────────────────────────────

describe("signUpAction", () => {
  it("creates user and returns success for valid data", async () => {
    const formData = new FormData();
    formData.set("name", "Integration Test");
    formData.set("email", TEST_EMAIL);
    formData.set("password", "ValidPass1!");
    formData.set("confirmPassword", "ValidPass1!");

    const result = await signUpAction({}, formData);

    expect(result.success).toMatch(/Account created/i);

    const [created] = await db
      .select()
      .from(user)
      .where(eq(user.email, TEST_EMAIL));
    expect(created).toBeDefined();
    expect(created.name).toBe("Integration Test");
  });

  it("returns error for duplicate email", async () => {
    const formData = new FormData();
    formData.set("name", "Alice Duplicate");
    formData.set("email", TEST_USERS.alice.email);
    formData.set("password", "ValidPass1!");
    formData.set("confirmPassword", "ValidPass1!");

    const result = await signUpAction({}, formData);

    expect(result.error).toMatch(/already exists/i);
  });

  it("returns fieldErrors for invalid email format", async () => {
    const formData = new FormData();
    formData.set("name", "Test User");
    formData.set("email", "not-an-email");
    formData.set("password", "ValidPass1!");
    formData.set("confirmPassword", "ValidPass1!");

    const result = await signUpAction({}, formData);

    expect(result.fieldErrors?.email).toBeDefined();

    const rows = await db
      .select()
      .from(user)
      .where(eq(user.email, "not-an-email"));
    expect(rows).toHaveLength(0);
  });

  it("returns fieldErrors when passwords don't match", async () => {
    const formData = new FormData();
    formData.set("name", "Test User");
    formData.set("email", TEST_EMAIL);
    formData.set("password", "ValidPass1!");
    formData.set("confirmPassword", "DifferentPass1!");

    const result = await signUpAction({}, formData);

    expect(result.fieldErrors?.confirmPassword).toBe("Passwords don't match");
  });

  it("returns fieldErrors for short password", async () => {
    const formData = new FormData();
    formData.set("name", "Test User");
    formData.set("email", TEST_EMAIL);
    formData.set("password", "short");
    formData.set("confirmPassword", "short");

    const result = await signUpAction({}, formData);

    expect(result.fieldErrors?.password).toBeDefined();
  });

  it("preserves name and email in values on validation failure", async () => {
    const formData = new FormData();
    formData.set("name", "Test User");
    formData.set("email", TEST_EMAIL);
    formData.set("password", "short");
    formData.set("confirmPassword", "short");

    const result = await signUpAction({}, formData);

    expect(result.values?.name).toBe("Test User");
    expect(result.values?.email).toBe(TEST_EMAIL);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// signInAction
// ─────────────────────────────────────────────────────────────────────────────

describe("signInAction", () => {
  beforeEach(() => {
    vi.mocked(redirect).mockClear();
  });

  it("calls redirect with AFTER_SIGN_IN for valid credentials", async () => {
    const formData = new FormData();
    formData.set("email", TEST_USERS.alice.email);
    formData.set("password", TEST_PASSWORD);

    await signInAction({}, formData);

    expect(redirect).toHaveBeenCalledWith(REDIRECT.AFTER_SIGN_IN);
  });

  it("returns error for wrong password", async () => {
    const formData = new FormData();
    formData.set("email", TEST_USERS.alice.email);
    formData.set("password", "WrongPassword1!");

    const result = await signInAction({}, formData);

    expect(result.error).toBeDefined();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("returns error for non-existent email", async () => {
    const formData = new FormData();
    formData.set("email", "nobody@test.local");
    formData.set("password", TEST_PASSWORD);

    const result = await signInAction({}, formData);

    expect(result.error).toBeDefined();
    expect(redirect).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// forgotPasswordAction
// ─────────────────────────────────────────────────────────────────────────────

describe("forgotPasswordAction", () => {
  it("always returns success for any valid email (enumeration protection)", async () => {
    const formData = new FormData();
    formData.set("email", "nobody@test.local");

    const result = await forgotPasswordAction({}, formData);

    expect(result.success).toMatch(/If an account exists/i);
  });

  it("returns fieldErrors for invalid email format", async () => {
    const formData = new FormData();
    formData.set("email", "not-an-email");

    const result = await forgotPasswordAction({}, formData);

    expect(result.fieldErrors?.email).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// resetPasswordAction
// ─────────────────────────────────────────────────────────────────────────────

describe("resetPasswordAction", () => {
  it("returns error when token is missing", async () => {
    const formData = new FormData();
    formData.set("password", "NewPass1!");
    formData.set("confirmPassword", "NewPass1!");
    // token not set

    const result = await resetPasswordAction({}, formData);

    expect(result.error).toMatch(/Invalid or missing reset token/i);
  });

  it("returns fieldErrors when passwords don't match", async () => {
    const formData = new FormData();
    formData.set("token", "some-token");
    formData.set("password", "NewPass1!");
    formData.set("confirmPassword", "DifferentPass1!");

    const result = await resetPasswordAction({}, formData);

    expect(result.fieldErrors?.confirmPassword).toBe("Passwords don't match");
  });
});
