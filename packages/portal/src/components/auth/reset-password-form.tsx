"use client";

import { useActionState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { resetPasswordAction, type FormState } from "./actions";
import { AUTH_ROUTES } from "@/const";

const initialState: FormState = {};

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [state, formAction, isPending] = useActionState(resetPasswordAction, initialState);

  // Redirect to sign-in after successful reset
  useEffect(() => {
    if (state.success) {
      const timeout = setTimeout(() => {
        router.push(AUTH_ROUTES.SIGN_IN);
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [state.success, router]);

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
          <Link href={AUTH_ROUTES.FORGOT_PASSWORD}>
            <Button className="w-full">Request New Link</Button>
          </Link>
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
        <form action={formAction} className="space-y-4">
          {/* Hidden field to pass token to server action */}
          <input type="hidden" name="token" value={token} />

          {state.error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {state.error}
            </div>
          )}
          {state.success && (
            <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-600">
              {state.success}
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
              aria-invalid={!!state.fieldErrors?.password}
            />
            {state.fieldErrors?.password && (
              <p className="text-sm text-destructive">{state.fieldErrors.password}</p>
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
              aria-invalid={!!state.fieldErrors?.confirmPassword}
            />
            {state.fieldErrors?.confirmPassword && (
              <p className="text-sm text-destructive">
                {state.fieldErrors.confirmPassword}
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
