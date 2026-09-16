import { describe, expect, test } from "bun:test";
import {
  buildBrevoPayload,
  resolveSenderName,
  sendContactEmail,
} from "./brevo";

const config = {
  apiKey: "test-key",
  senderEmail: "sender@example.com",
  senderName: "Kevin Tarqui",
  recipientEmail: "recipient@example.com",
};

const input = {
  name: "Ana López",
  email: "ana@example.com",
  message: "Hola, quiero hablar sobre un proyecto.",
};

describe("buildBrevoPayload", () => {
  test("usa sender y to desde la configuración, y replyTo desde el visitante", () => {
    const payload = buildBrevoPayload(input, config);
    expect(payload.sender).toEqual({
      name: "Kevin Tarqui",
      email: "sender@example.com",
    });
    expect(payload.to).toEqual([{ email: "recipient@example.com" }]);
    expect(payload.replyTo).toEqual({
      email: "ana@example.com",
      name: "Ana López",
    });
    expect(payload.textContent).toBe(input.message);
  });
});

describe("sendContactEmail", () => {
  test("devuelve ok cuando Brevo responde 2xx", async () => {
    const fetchImpl = (async () =>
      new Response(null, { status: 201 })) as unknown as typeof fetch;

    const result = await sendContactEmail(input, config, fetchImpl);
    expect(result).toEqual({ ok: true });
  });

  test("devuelve error http cuando Brevo responde con error", async () => {
    const fetchImpl = (async () =>
      new Response(null, { status: 401 })) as unknown as typeof fetch;

    const result = await sendContactEmail(input, config, fetchImpl);
    expect(result).toEqual({ ok: false, status: 401, reason: "http_error" });
  });

  test("devuelve error de red si fetch lanza", async () => {
    const fetchImpl = (async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;

    const result = await sendContactEmail(input, config, fetchImpl);
    expect(result).toEqual({ ok: false, reason: "network_error" });
  });

  test("envía la api-key en el header y nunca en el body", async () => {
    let capturedInit: RequestInit | undefined;
    const fetchImpl = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      capturedInit = init;
      return new Response(null, { status: 201 });
    }) as unknown as typeof fetch;

    await sendContactEmail(input, config, fetchImpl);

    const headers = new Headers(capturedInit?.headers);
    expect(headers.get("api-key")).toBe("test-key");
    expect(String(capturedInit?.body)).not.toContain("test-key");
  });
});

describe("resolveSenderName", () => {
  test("usa el nombre configurado cuando existe", () => {
    expect(resolveSenderName("Kevin T.", "Kevin Tarqui")).toBe("Kevin T.");
  });

  test("usa el fallback cuando no hay nombre configurado", () => {
    expect(resolveSenderName(undefined, "Kevin Tarqui")).toBe("Kevin Tarqui");
    expect(resolveSenderName("", "Kevin Tarqui")).toBe("Kevin Tarqui");
    expect(resolveSenderName("   ", "Kevin Tarqui")).toBe("Kevin Tarqui");
  });
});
