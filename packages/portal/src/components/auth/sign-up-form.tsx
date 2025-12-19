"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";
import { Label } from "@/components/shadcn/label";
import { GoogleIcon } from "@/components/icons";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/shadcn/card";
import { signUpAction, type SignUpState } from "./actions";
import { signIn } from "@/lib/auth/client";
import { AUTH_ROUTES, REDIRECT } from "@/const";

const initialState: SignUpState = {};

export function SignUpForm() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    signUpAction,
    initialState
  );

  // Redirect to sign-in after successful sign-up
  useEffect(() => {
    if (state.success) {
      const timeout = setTimeout(() => {
        router.push(AUTH_ROUTES.SIGN_IN);
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [state.success, router]);

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Create an account</CardTitle>
        <CardDescription>Enter your details to get started</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state.error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {state.error}
            </div>
          )}
          {state.success && (
            <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-600">
              {state.success}
              <p className="mt-1 text-xs text-green-600/80">
                Redirecting to sign in...
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="Your name"
              autoComplete="name"
              defaultValue={state.values?.name}
              aria-invalid={!!state.fieldErrors?.name}
            />
            {state.fieldErrors?.name && (
              <p className="text-sm text-destructive">
                {state.fieldErrors.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              defaultValue={state.values?.email}
              aria-invalid={!!state.fieldErrors?.email}
            />
            {state.fieldErrors?.email && (
              <p className="text-sm text-destructive">
                {state.fieldErrors.email}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              aria-invalid={!!state.fieldErrors?.password}
            />
            {state.fieldErrors?.password && (
              <p className="text-sm text-destructive">
                {state.fieldErrors.password}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
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
            Create Account
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={isPending}
            onClick={() => {
              signIn.social({
                provider: "google",
                callbackURL: REDIRECT.AFTER_SIGN_IN,
              });
            }}
          >
            <GoogleIcon className="mr-2 size-4" />
            Continue with Google
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
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
