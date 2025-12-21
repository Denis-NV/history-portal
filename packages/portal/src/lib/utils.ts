import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a date from year/month/day components
 * Handles BCE dates (negative years)
 */
export const formatDate = (
  year: number,
  month: number | null,
  day: number | null
): string => {
  const era = year < 0 ? " BCE" : "";
  const absYear = Math.abs(year);

  if (month && day) {
    return `${day}/${month}/${absYear}${era}`;
  }
  if (month) {
    return `${month}/${absYear}${era}`;
  }
  return `${absYear}${era}`;
};
