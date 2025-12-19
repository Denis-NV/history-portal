"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";
import { Label } from "@/components/shadcn/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/shadcn/card";
import { resetPasswordSchema, type ResetPasswordValues } from "./schemas";
import { validateForm } from "./validation";
import { authClient } from "@/lib/auth/client";
import { AUTH_ROUTES } from "@/const";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!token) {
      setError(
        "Invalid or missing reset token. Please request a new password reset link."
      );
      return;
    }

    const formData = new FormData(e.currentTarget);
    const data = {
      password: formData.get("password") as string,
      confirmPassword: formData.get("confirmPassword") as string,
    };

    const { data: validData, errors } = validateForm<ResetPasswordValues>(
      data,
      resetPasswordSchema
    );

    if (errors || !validData) {
      setFieldErrors(errors || {});
      return;
    }

    setError(undefined);
    setSuccess(undefined);
    setFieldErrors({});
    startTransition(async () => {
      const { error } = await authClient.resetPassword({
        token,
        newPassword: validData.password,
      });

      if (error) {
        setError(
          error.message ||
            "Failed to reset password. The link may have expired."
        );
        return;
      }

      setSuccess("Password reset successfully! Redirecting to sign in...");
      setTimeout(() => {
        router.push(AUTH_ROUTES.SIGN_IN);
      }, 2000);
    });
  };

  if (!token) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Invalid Link</CardTitle>
          <CardDescription>
            This password reset link is invalid or has expired
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full"
            onClick={() => router.push(AUTH_ROUTES.FORGOT_PASSWORD)}
          >
            Request New Link
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Reset password</CardTitle>
        <CardDescription>Enter your new password below</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-600">
              {success}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              aria-invalid={!!fieldErrors.password}
            />
            {fieldErrors.password && (
              <p className="text-sm text-destructive">{fieldErrors.password}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              aria-invalid={!!fieldErrors.confirmPassword}
            />
            {fieldErrors.confirmPassword && (
              <p className="text-sm text-destructive">
                {fieldErrors.confirmPassword}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Reset Password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
