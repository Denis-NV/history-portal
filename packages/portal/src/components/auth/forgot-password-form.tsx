"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
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
import { forgotPasswordSchema, type ForgotPasswordValues } from "./schemas";
import { validateForm } from "./validation";
import { authClient } from "@/lib/auth/client";
import { AUTH_ROUTES } from "@/const";

export function ForgotPasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      email: formData.get("email") as string,
    };

    const { data: validData, errors } = validateForm<ForgotPasswordValues>(
      data,
      forgotPasswordSchema
    );

    if (errors || !validData) {
      setFieldErrors(errors || {});
      return;
    }

    setError(undefined);
    setSuccess(undefined);
    setFieldErrors({});
    startTransition(async () => {
      const { error } = await authClient.requestPasswordReset({
        email: validData.email,
        redirectTo: AUTH_ROUTES.RESET_PASSWORD,
      });

      if (error) {
        setError(
          error.message || "Failed to send reset email. Please try again."
        );
        return;
      }

      setSuccess(
        "If an account exists with this email, you will receive a password reset link."
      );
    });
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Forgot password?</CardTitle>
        <CardDescription>
          Enter your email address and we&apos;ll send you a link to reset your
          password
        </CardDescription>
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
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              aria-invalid={!!fieldErrors.email}
            />
            {fieldErrors.email && (
              <p className="text-sm text-destructive">{fieldErrors.email}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Send Reset Link
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Remember your password?{" "}
            <Link
              href={AUTH_ROUTES.SIGN_IN}
              className="text-primary hover:underline"
            >
              Sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
