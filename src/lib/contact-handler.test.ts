import { describe, expect, test } from "bun:test";
import { handleContactRequest } from "./contact-handler";
import type { BrevoConfig, ContactEmailInput, SendResult } from "./brevo";

const allowedOrigin = "https://kevintarqui.vercel.app";

const validConfig: BrevoConfig = {
  apiKey: "test-key",
  senderEmail: "sender@example.com",
  senderName: "Kevin Tarqui",
  recipientEmail: "recipient@example.com",
};

function formRequest(
  fields: Record<string, string>,
  options: { origin?: string; accept?: string } = {},
): Request {
  const body = new URLSearchParams(fields);
  const headers: Record<string, string> = {
    "content-type": "application/x-www-form-urlencoded",
  };
  if (options.origin) headers.origin = options.origin;
  if (options.accept) headers.accept = options.accept;

  return new Request("https://kevintarqui.vercel.app/api/contact/", {
    method: "POST",
    headers,
    body: body.toString(),
  });
}

const validFields = {
  name: "Ana López",
  email: "ana@example.com",
  message: "Hola, quiero hablar sobre un proyecto.",
  locale: "es",
  company: "",
  startedAt: String(Date.now() - 5000),
};

describe("handleContactRequest", () => {
  test("envía correctamente y responde 200 en JSON", async () => {
    let calledWith: { input: ContactEmailInput; config: BrevoConfig } | null =
      null;
    const send = async (
      input: ContactEmailInput,
      config: BrevoConfig,
    ): Promise<SendResult> => {
      calledWith = { input, config };
      return { ok: true };
    };

    const response = await handleContactRequest(
      formRequest(validFields, { accept: "application/json" }),
      { config: validConfig, send, allowedOrigin },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(calledWith).not.toBeNull();
    expect(calledWith!.input).toEqual({
      name: "Ana López",
      email: "ana@example.com",
      message: "Hola, quiero hablar sobre un proyecto.",
    });
    expect(calledWith!.config).toEqual(validConfig);
  });

  test("redirige a /es/contact/sent/ sin accept: application/json", async () => {
    const send = async (): Promise<SendResult> => ({ ok: true });

    const response = await handleContactRequest(formRequest(validFields), {
      config: validConfig,
      send,
      allowedOrigin,
    });

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/es/contact/sent/");
  });

  test("devuelve 422 con errores por campo cuando el payload es inválido", async () => {
    const send = async (): Promise<SendResult> => ({ ok: true });
    const fields = { ...validFields, name: "", email: "no-valido" };

    const response = await handleContactRequest(
      formRequest(fields, { accept: "application/json" }),
      { config: validConfig, send, allowedOrigin },
    );

    expect(response.status).toBe(422);
    const body = (await response.json()) as { errors: Record<string, string> };
    expect(body.errors.name).toBe("required");
    expect(body.errors.email).toBe("invalid_email");
  });

  test("el honeypot relleno responde éxito falso sin llamar a send", async () => {
    let sendCalled = false;
    const send = async (): Promise<SendResult> => {
      sendCalled = true;
      return { ok: true };
    };
    const fields = { ...validFields, company: "soy un bot" };

    const response = await handleContactRequest(
      formRequest(fields, { accept: "application/json" }),
      { config: validConfig, send, allowedOrigin },
    );

    expect(response.status).toBe(200);
    expect(sendCalled).toBe(false);
  });

  test("un envío demasiado rápido no llama a send", async () => {
    let sendCalled = false;
    const send = async (): Promise<SendResult> => {
      sendCalled = true;
      return { ok: true };
    };
    const fields = { ...validFields, startedAt: String(Date.now()) };

    await handleContactRequest(
      formRequest(fields, { accept: "application/json" }),
      { config: validConfig, send, allowedOrigin },
    );

    expect(sendCalled).toBe(false);
  });

  test("un Origin ajeno responde 403", async () => {
    const send = async (): Promise<SendResult> => ({ ok: true });

    const response = await handleContactRequest(
      formRequest(validFields, {
        origin: "https://evil.example",
        accept: "application/json",
      }),
      { config: validConfig, send, allowedOrigin },
    );

    expect(response.status).toBe(403);
  });

  test("configuración incompleta responde 503", async () => {
    const send = async (): Promise<SendResult> => ({ ok: true });

    const response = await handleContactRequest(
      formRequest(validFields, { accept: "application/json" }),
      { config: null, send, allowedOrigin },
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      ok: false,
      error: "not_configured",
    });
  });

  test("un fallo de envío responde 502", async () => {
    const send = async (): Promise<SendResult> => ({
      ok: false,
      reason: "http_error",
      status: 401,
    });

    const response = await handleContactRequest(
      formRequest(validFields, { accept: "application/json" }),
      { config: validConfig, send, allowedOrigin },
    );

    expect(response.status).toBe(502);
  });
});
