"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import {
  signUpSchema,
  signInSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./schemas";
import { auth } from "@/lib/auth";
import { AUTH_ROUTES, REDIRECT } from "@/const";

// ─────────────────────────────────────────────────────────────────────────────
// Shared Types
// ─────────────────────────────────────────────────────────────────────────────

export type FormState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
};

// Alias for backwards compatibility
export type SignUpState = FormState;

// ─────────────────────────────────────────────────────────────────────────────
// Error Handling
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts technical error messages to user-friendly ones.
 * Logs the original error for debugging.
 */
function getUserFriendlyError(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : String(err);

  // Log for server-side debugging
  console.error("[Auth Error]", message);

  // Database connection errors
  if (
    message.includes("ECONNREFUSED") ||
    message.includes("connection") ||
    message.includes("Console request failed")
  ) {
    return "Unable to connect to the database. Please try again later.";
  }

  // User already exists
  if (message.includes("already exists") || message.includes("duplicate")) {
    return "An account with this email already exists.";
  }

  // Invalid credentials
  if (
    message.includes("Invalid") ||
    message.includes("invalid") ||
    message.includes("incorrect")
  ) {
    return "Invalid email or password.";
  }

  // Email not verified
  if (
    message.includes("not verified") ||
    message.includes("Email not verified")
  ) {
    return "Please verify your email before signing in. Check your inbox for the verification link.";
  }

  // Rate limiting
  if (message.includes("rate") || message.includes("too many")) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  // Token errors
  if (message.includes("token") || message.includes("expired")) {
    return "This link has expired. Please request a new one.";
  }

  // Default fallback
  return fallback;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sign Up Action
// ─────────────────────────────────────────────────────────────────────────────

export async function signUpAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const data = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  };

  const result = signUpSchema.safeParse(data);

  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.map(String).join(".") || "_form";
      if (!fieldErrors[path]) fieldErrors[path] = issue.message;
    }
    return { fieldErrors, values: { name: data.name, email: data.email } };
  }

  try {
    const response = await auth.api.signUpEmail({
      body: {
        name: result.data.name,
        email: result.data.email,
        password: result.data.password,
        callbackURL: AUTH_ROUTES.SIGN_IN,
      },
      headers: await headers(),
    });

    if (!response) {
      return { error: "Failed to create account. Please try again." };
    }

    return {
      success:
        "Account created! Please check your email to verify your account.",
    };
  } catch (err) {
    return {
      error: getUserFriendlyError(
        err,
        "Failed to create account. Please try again."
      ),
      values: { name: result.data.name, email: result.data.email },
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sign In Action
// ─────────────────────────────────────────────────────────────────────────────

export async function signInAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const result = signInSchema.safeParse(data);

  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.map(String).join(".") || "_form";
      if (!fieldErrors[path]) fieldErrors[path] = issue.message;
    }
    return { fieldErrors, values: { email: data.email } };
  }

  try {
    // With nextCookies plugin, cookies are automatically set
    // No need for asResponse: true or manual cookie handling
    await auth.api.signInEmail({
      body: {
        email: result.data.email,
        password: result.data.password,
      },
    });
  } catch (err) {
    // Better Auth throws on invalid credentials
    const message = err instanceof Error ? err.message : String(err);

    // Check for common auth errors
    if (message.includes("Invalid") || message.includes("credentials")) {
      return {
        error: "Invalid email or password.",
        values: { email: result.data.email },
      };
    }

    return {
      error: getUserFriendlyError(err, "Failed to sign in. Please try again."),
      values: { email: result.data.email },
    };
  }

  // Redirect on success (must be outside try/catch)
  redirect(REDIRECT.AFTER_SIGN_IN);
}

// ─────────────────────────────────────────────────────────────────────────────
// Forgot Password Action
// ─────────────────────────────────────────────────────────────────────────────

export async function forgotPasswordAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const data = {
    email: formData.get("email") as string,
  };

  const result = forgotPasswordSchema.safeParse(data);

  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.map(String).join(".") || "_form";
      if (!fieldErrors[path]) fieldErrors[path] = issue.message;
    }
    return { fieldErrors, values: { email: data.email } };
  }

  try {
    // forgetPassword sends reset email via sendResetPassword callback in auth config
    await auth.api.requestPasswordReset({
      body: {
        email: result.data.email,
        redirectTo: AUTH_ROUTES.RESET_PASSWORD,
      },
    });
  } catch {
    // Ignore errors to prevent email enumeration
  }

  // Always show success to prevent email enumeration
  return {
    success:
      "If an account exists with this email, you will receive a password reset link.",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Reset Password Action
// ─────────────────────────────────────────────────────────────────────────────

export async function resetPasswordAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const token = formData.get("token") as string;

  if (!token) {
    return {
      error:
        "Invalid or missing reset token. Please request a new password reset link.",
    };
  }

  const data = {
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  };

  const result = resetPasswordSchema.safeParse(data);

  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.map(String).join(".") || "_form";
      if (!fieldErrors[path]) fieldErrors[path] = issue.message;
    }
    return { fieldErrors, values: {} };
  }

  try {
    await auth.api.resetPassword({
      body: {
        token,
        newPassword: result.data.password,
      },
      headers: await headers(),
    });

    return {
      success: "Password reset successfully! Redirecting to sign in...",
    };
  } catch (err) {
    return {
      error: getUserFriendlyError(
        err,
        "Failed to reset password. The link may have expired."
      ),
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sign Out Action
// ─────────────────────────────────────────────────────────────────────────────

export async function signOutAction(): Promise<void> {
  await auth.api.signOut({
    headers: await headers(),
  });

  redirect(REDIRECT.AFTER_SIGN_OUT);
}
