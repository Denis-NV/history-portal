import { describe, it, expect } from "vitest";
import { formatDate } from "./utils";

describe("formatDate", () => {
  it("formats full date (day/month/year)", () => {
    expect(formatDate(2024, 12, 25)).toBe("25/12/2024");
  });

  it("formats partial date (month/year)", () => {
    expect(formatDate(2024, 6, null)).toBe("6/2024");
  });

  it("formats year only", () => {
    expect(formatDate(2024, null, null)).toBe("2024");
  });

  it("handles BCE dates (negative years)", () => {
    expect(formatDate(-4000, null, null)).toBe("4000 BCE");
    expect(formatDate(-776, 7, null)).toBe("7/776 BCE");
    expect(formatDate(-44, 3, 15)).toBe("15/3/44 BCE");
  });

  it("handles year zero edge case", () => {
    expect(formatDate(0, null, null)).toBe("0");
  });
});
