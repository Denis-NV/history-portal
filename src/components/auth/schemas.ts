import { z } from "zod";

export const signInSchema = z.object({
  email: z.email({ message: "Please enter a valid email address" }),
  password: z.string().min(1, "Password is required"),
});

export const signUpSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.email({ message: "Please enter a valid email address" }),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.email({ message: "Please enter a valid email address" }),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// Type exports using Zod 4 Output type
export type SignInValues = z.output<typeof signInSchema>;
export type SignUpValues = z.output<typeof signUpSchema>;
export type ForgotPasswordValues = z.output<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.output<typeof resetPasswordSchema>;

// Legacy type aliases for compatibility
export type SignInInput = SignInValues;
export type SignUpInput = SignUpValues;
export type ForgotPasswordInput = ForgotPasswordValues;
export type ResetPasswordInput = ResetPasswordValues;
