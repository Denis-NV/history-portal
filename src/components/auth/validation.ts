import type { z } from "zod";

type ValidationResult<T> =
  | { data: T; errors: null }
  | { data: null; errors: Record<string, string> };

/**
 * Validate form data against a Zod schema
 * Returns either the validated data or a record of field errors
 */
export function validateForm<T>(
  data: Record<string, unknown>,
  schema: z.ZodType<T>
): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return { data: result.data, errors: null };
  }

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.map(String).join(".") || "_form";
    if (!errors[path]) errors[path] = issue.message;
  }
  return { data: null, errors };
}
