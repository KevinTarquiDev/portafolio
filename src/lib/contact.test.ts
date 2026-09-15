import { describe, expect, test } from "bun:test";
import { isLikelySpam, validateContact } from "./contact";

describe("validateContact", () => {
  test("acepta un payload válido", () => {
    const result = validateContact({
      name: "Ana López",
      email: "ana@example.com",
      message: "Hola, quiero hablar sobre un proyecto.",
    });
    expect(result.ok).toBe(true);
  });

  test("recorta espacios", () => {
    const result = validateContact({
      name: "  Ana López  ",
      email: "  ana@example.com  ",
      message: "  Hola, quiero hablar sobre un proyecto.  ",
    });
    expect(result).toEqual({
      ok: true,
      data: {
        name: "Ana López",
        email: "ana@example.com",
        message: "Hola, quiero hablar sobre un proyecto.",
      },
    });
  });

  test("rechaza un objeto vacío con errores por campo", () => {
    const result = validateContact({});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual({
        name: "required",
        email: "required",
        message: "required",
      });
    }
  });

  test("rechaza un valor que no es objeto", () => {
    expect(validateContact(null).ok).toBe(false);
    expect(validateContact("texto").ok).toBe(false);
    expect(validateContact(undefined).ok).toBe(false);
  });

  test("rechaza nombre demasiado corto o demasiado largo", () => {
    const short = validateContact({
      name: "A",
      email: "a@example.com",
      message: "1234567890",
    });
    expect(short.ok).toBe(false);
    if (!short.ok) expect(short.errors.name).toBe("too_short");

    const long = validateContact({
      name: "A".repeat(101),
      email: "a@example.com",
      message: "1234567890",
    });
    expect(long.ok).toBe(false);
    if (!long.ok) expect(long.errors.name).toBe("too_long");
  });

  test("rechaza saltos de línea en el nombre", () => {
    const result = validateContact({
      name: "Ana\nLópez",
      email: "a@example.com",
      message: "1234567890",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.name).toBe("invalid_characters");
  });

  test("rechaza un email con formato inválido", () => {
    const result = validateContact({
      name: "Ana",
      email: "no-es-un-email",
      message: "1234567890",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.email).toBe("invalid_email");
  });

  test("rechaza mensaje demasiado corto o demasiado largo", () => {
    const short = validateContact({
      name: "Ana",
      email: "a@example.com",
      message: "corto",
    });
    expect(short.ok).toBe(false);
    if (!short.ok) expect(short.errors.message).toBe("too_short");

    const long = validateContact({
      name: "Ana",
      email: "a@example.com",
      message: "a".repeat(2001),
    });
    expect(long.ok).toBe(false);
    if (!long.ok) expect(long.errors.message).toBe("too_long");
  });
});

describe("isLikelySpam", () => {
  test("marca como spam si el honeypot no está vacío", () => {
    expect(isLikelySpam("relleno", "", Date.now())).toBe(true);
  });

  test("no marca como spam un honeypot vacío con tiempo suficiente", () => {
    const startedAt = String(Date.now() - 5000);
    expect(isLikelySpam("", startedAt, Date.now())).toBe(false);
  });

  test("marca como spam si el envío es demasiado rápido", () => {
    const startedAt = String(Date.now() - 500);
    expect(isLikelySpam("", startedAt, Date.now())).toBe(true);
  });

  test("no falla si falta startedAt", () => {
    expect(isLikelySpam("", undefined, Date.now())).toBe(false);
  });
});
