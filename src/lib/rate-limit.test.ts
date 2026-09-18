import { beforeEach, describe, expect, test } from "bun:test";
import {
  CONTACT_RATE_LIMIT,
  hitRateLimit,
  rateLimitKey,
  resetRateLimit,
} from "./rate-limit";

const rule = { max: 3, windowMs: 1000 };

beforeEach(() => {
  resetRateLimit();
});

describe("hitRateLimit", () => {
  test("permite hasta el máximo y bloquea el siguiente", () => {
    const results = [1, 2, 3, 4].map(() => hitRateLimit("ip", rule, 0));
    expect(results).toEqual([false, false, false, true]);
  });

  test("vuelve a permitir al salir de la ventana", () => {
    for (let i = 0; i < rule.max; i++) {
      hitRateLimit("ip", rule, 0);
    }
    expect(hitRateLimit("ip", rule, 999)).toBe(true);
    expect(hitRateLimit("ip", rule, 1001)).toBe(false);
  });

  test("cada remitente tiene su propio cupo", () => {
    for (let i = 0; i < rule.max; i++) {
      hitRateLimit("ip-a", rule, 0);
    }
    expect(hitRateLimit("ip-a", rule, 0)).toBe(true);
    expect(hitRateLimit("ip-b", rule, 0)).toBe(false);
  });

  test("estar bloqueado no alarga el castigo", () => {
    for (let i = 0; i < rule.max; i++) {
      hitRateLimit("ip", rule, 0);
    }
    // Un intento rechazado no debe registrarse, o la ventana nunca vencería.
    hitRateLimit("ip", rule, 500);
    expect(hitRateLimit("ip", rule, 1001)).toBe(false);
  });

  test("la regla por defecto del contacto es estable", () => {
    expect(CONTACT_RATE_LIMIT.max).toBe(3);
    expect(CONTACT_RATE_LIMIT.windowMs).toBe(600_000);
  });
});

describe("rateLimitKey", () => {
  function requestWith(headers: Record<string, string>): Request {
    return new Request("https://kevintarqui.vercel.app/api/contact/", {
      method: "POST",
      headers,
    });
  }

  test("usa la primera IP de x-forwarded-for", () => {
    const request = requestWith({
      "x-forwarded-for": "203.0.113.5, 70.41.3.18",
    });
    expect(rateLimitKey(request)).toBe("203.0.113.5");
  });

  test("sin cabecera agrupa en un cupo común", () => {
    expect(rateLimitKey(requestWith({}))).toBe("desconocido");
  });
});
