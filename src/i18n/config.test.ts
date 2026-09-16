import { describe, expect, test } from "bun:test";
import {
  alternateLocale,
  defaultLocale,
  isLocale,
  locales,
  localePath,
} from "./config";

describe("locales", () => {
  test("incluye español e inglés, con español por defecto", () => {
    expect(locales).toEqual(["es", "en"]);
    expect(defaultLocale).toBe("es");
  });
});

describe("isLocale", () => {
  test("acepta los locales soportados", () => {
    expect(isLocale("es")).toBe(true);
    expect(isLocale("en")).toBe(true);
  });

  test("rechaza cualquier otro valor", () => {
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
    expect(isLocale(42)).toBe(false);
    expect(isLocale(null)).toBe(false);
  });
});

describe("localePath", () => {
  test("construye la ruta base del locale", () => {
    expect(localePath("es")).toBe("/es/");
    expect(localePath("en")).toBe("/en/");
  });

  test("añade el hash cuando se pasa", () => {
    expect(localePath("es", "#contact")).toBe("/es/#contact");
  });
});

describe("alternateLocale", () => {
  test("devuelve el idioma opuesto", () => {
    expect(alternateLocale("es")).toBe("en");
    expect(alternateLocale("en")).toBe("es");
  });
});
