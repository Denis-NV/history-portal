"use client";

import { useActionState } from "react";
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
import { signInAction, type FormState } from "./actions";
import { signIn } from "@/lib/auth/client";
import { AUTH_ROUTES, REDIRECT } from "@/const";

const initialState: FormState = {};

export function SignInForm() {
  const [state, formAction, isPending] = useActionState(
    signInAction,
    initialState
  );

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>Sign in to your account to continue</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state.error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {state.error}
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
              autoComplete="current-password"
              aria-invalid={!!state.fieldErrors?.password}
            />
            {state.fieldErrors?.password && (
              <p className="text-sm text-destructive">
                {state.fieldErrors.password}
              </p>
            )}
          </div>

          <div className="flex justify-end">
            <Link
              href={AUTH_ROUTES.FORGOT_PASSWORD}
              className="text-sm text-muted-foreground hover:text-primary"
            >
              Forgot password?
            </Link>
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Sign In
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
            Don&apos;t have an account?{" "}
            <Link
              href={AUTH_ROUTES.SIGN_UP}
              className="text-primary hover:underline"
            >
              Sign up
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
