import { describe, expect, test } from "bun:test";
import {
  formatMonthRange,
  formatYearRange,
  localeToBcp47,
  parseResumeDate,
} from "./dates";

describe("parseResumeDate", () => {
  test("parsea año y mes", () => {
    expect(parseResumeDate("2023-06")).toEqual({ year: 2023, month: 6 });
  });

  test("parsea solo año", () => {
    expect(parseResumeDate("2021")).toEqual({ year: 2021 });
  });

  test("lanza con formato inválido", () => {
    expect(() => parseResumeDate("junio-2023")).toThrow();
    expect(() => parseResumeDate("")).toThrow();
    expect(() => parseResumeDate("2023-6")).toThrow();
  });
});

describe("formatYearRange", () => {
  test("un solo año cuando coinciden", () => {
    expect(formatYearRange("2026-04", "2026-08", "Actualidad")).toBe("2026");
  });

  test("rango de años cuando difieren", () => {
    expect(formatYearRange("2023-06", "2026-05", "Actualidad")).toBe(
      "2023 — 2026",
    );
  });

  test("usa el label de presente cuando falta end", () => {
    expect(formatYearRange("2023-06", undefined, "Actualidad")).toBe(
      "2023 — Actualidad",
    );
    expect(formatYearRange("2023-06", undefined, "Present")).toBe(
      "2023 — Present",
    );
  });
});

describe("formatMonthRange", () => {
  test("formatea meses en español", () => {
    const result = formatMonthRange("2023-06", "2026-05", "es", "Actualidad");
    expect(result).toContain("2023");
    expect(result).toContain("2026");
    expect(result).toContain("—");
  });

  test("formatea meses en inglés", () => {
    const result = formatMonthRange("2023-06", "2026-05", "en", "Present");
    expect(result).toContain("2023");
    expect(result).toContain("2026");
  });

  test("usa el label de presente cuando falta end", () => {
    const result = formatMonthRange("2023-06", undefined, "es", "Actualidad");
    expect(result.endsWith("Actualidad")).toBe(true);
  });
});

describe("localeToBcp47", () => {
  test("mapea los locales soportados", () => {
    expect(localeToBcp47("es")).toBe("es-EC");
    expect(localeToBcp47("en")).toBe("en-US");
  });
});
