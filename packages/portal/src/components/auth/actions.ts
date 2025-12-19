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
    const message =
      err instanceof Error ? err.message : "Failed to create account";
    return {
      error: message,
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
    const response = await auth.api.signInEmail({
      body: {
        email: result.data.email,
        password: result.data.password,
      },
      headers: await headers(),
    });

    if (!response) {
      return {
        error: "Invalid email or password.",
        values: { email: result.data.email },
      };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to sign in";
    return { error: message, values: { email: result.data.email } };
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
    // Call the forget-password endpoint via fetch since it may not be typed in auth.api
    const baseUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/auth/forget-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: result.data.email,
        redirectTo: AUTH_ROUTES.RESET_PASSWORD,
      }),
    });

    if (!response.ok) {
      // Don't reveal whether the email exists
    }

    // Always show success to prevent email enumeration
    return {
      success:
        "If an account exists with this email, you will receive a password reset link.",
    };
  } catch {
    // Still show success to prevent email enumeration
    return {
      success:
        "If an account exists with this email, you will receive a password reset link.",
    };
  }
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
    const message =
      err instanceof Error
        ? err.message
        : "Failed to reset password. The link may have expired.";
    return { error: message };
  }
}
