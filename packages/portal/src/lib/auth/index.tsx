import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { Resend } from "resend";

import { db, user, session, account, verification } from "@history-portal/db";
import { EmailTemplate } from "./email-template";

// ─────────────────────────────────────────────────────────────────────────────
// Better Auth Server Configuration
// ─────────────────────────────────────────────────────────────────────────────
// This is the main server-side auth configuration.
// It handles authentication, session management, and email verification.
//
// Providers:
// - Email/Password with email verification
// - Google OAuth
//
// See: https://www.better-auth.com/docs
// ─────────────────────────────────────────────────────────────────────────────

// Initialize Resend for sending verification emails
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export const auth = betterAuth({
  // ─────────────────────────────────────────────────────────────────────────
  // Database Configuration
  // ─────────────────────────────────────────────────────────────────────────
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user,
      session,
      account,
      verification,
    },
  }),

  // ─────────────────────────────────────────────────────────────────────────
  // Email/Password Authentication
  // ─────────────────────────────────────────────────────────────────────────
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user: emailUser, url }) => {
      if (!resend) {
        console.warn(
          "RESEND_API_KEY not set. Password reset disabled in development."
        );
        console.log(`Password reset URL for ${emailUser.email}: ${url}`);
        return;
      }

      const name = emailUser.name || emailUser.email.split("@")[0];

      await resend.emails.send({
        from: process.env.EMAIL_FROM ?? "onboarding@resend.dev",
        to: emailUser.email,
        subject: "Reset your password",
        react: EmailTemplate({
          action: "Reset Password",
          content: (
            <>
              <p>Hello {name},</p>
              <p>
                We received a request to reset your password. Click the button
                below to choose a new password.
              </p>
              <p>This link will expire in 1 hour.</p>
            </>
          ),
          heading: "Reset Your Password",
          siteName: "History Portal",
          url,
        }),
      });
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Email Configuration (Resend)
  // ─────────────────────────────────────────────────────────────────────────
  emailVerification: {
    sendVerificationEmail: async ({ user: emailUser, url }) => {
      if (!resend) {
        console.warn(
          "RESEND_API_KEY not set. Email verification disabled in development."
        );
        console.log(`Verification URL for ${emailUser.email}: ${url}`);
        return;
      }

      const name = emailUser.name || emailUser.email.split("@")[0];

      await resend.emails.send({
        from: process.env.EMAIL_FROM ?? "onboarding@resend.dev",
        to: emailUser.email,
        subject: "Verify your email address",
        react: EmailTemplate({
          action: "Verify Email",
          content: (
            <>
              <p>Hello {name},</p>
              <p>Click the button below to verify your email address.</p>
            </>
          ),
          heading: "Verify Email",
          siteName: "History Portal",
          url,
        }),
      });
    },
    sendOnSignUp: true,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Social Providers
  // ─────────────────────────────────────────────────────────────────────────
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      // Map Google profile to user fields
      mapProfileToUser: (profile) => ({
        name: profile.name,
        image: profile.picture,
      }),
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // User Configuration
  // ─────────────────────────────────────────────────────────────────────────
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "user",
        input: false, // Don't allow user to set role on signup
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Advanced Configuration
  // ─────────────────────────────────────────────────────────────────────────
  advanced: {
    database: {
      // Let PostgreSQL generate UUIDs
      generateId: false,
    },
  },
});

// Export auth types for use in other files
export type Auth = typeof auth;
