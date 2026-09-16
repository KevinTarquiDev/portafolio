import { isLikelySpam, validateContact } from "./contact";
import type { BrevoConfig, ContactEmailInput, SendResult } from "./brevo";
import { isLocale, defaultLocale } from "../i18n/config";

/**
 * Lógica HTTP de /api/contact, independiente de Astro para poder
 * testearla sin red ni request reales. api/contact.ts solo conecta
 * esto con astro:env y sendContactEmail.
 */

export interface ContactHandlerDeps {
  /** null cuando falta configuración server-side requerida (503). */
  config: BrevoConfig | null;
  send: (input: ContactEmailInput, config: BrevoConfig) => Promise<SendResult>;
  /** Origen propio del sitio (por ejemplo SITE_URL), para validar Origin. */
  allowedOrigin: string;
}

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function redirectResponse(location: string): Response {
  return new Response(null, { status: 303, headers: { location } });
}

function wantsJson(request: Request): boolean {
  return (request.headers.get("accept") ?? "").includes("application/json");
}

function isOriginAllowed(request: Request, allowedOrigin: string): boolean {
  const originHeader = request.headers.get("origin");
  if (!originHeader) {
    return true;
  }

  try {
    const originHost = new URL(originHeader).host;
    const requestHost = new URL(request.url).host;
    const allowedHost = new URL(allowedOrigin).host;
    return originHost === requestHost || originHost === allowedHost;
  } catch {
    return false;
  }
}

function readLocaleField(formData: FormData): string {
  const value = formData.get("locale");
  return typeof value === "string" && isLocale(value) ? value : defaultLocale;
}

export async function handleContactRequest(
  request: Request,
  deps: ContactHandlerDeps,
): Promise<Response> {
  if (!isOriginAllowed(request, deps.allowedOrigin)) {
    return wantsJson(request)
      ? jsonResponse(403, { ok: false, error: "origin_not_allowed" })
      : new Response("Origin no permitido", { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return wantsJson(request)
      ? jsonResponse(422, { ok: false, errors: { form: "invalid_body" } })
      : redirectResponse(`/${defaultLocale}/contact/error/`);
  }

  const locale = readLocaleField(formData);
  const errorRedirect = `/${locale}/contact/error/`;
  const sentRedirect = `/${locale}/contact/sent/`;

  if (isLikelySpam(formData.get("company"), formData.get("startedAt"))) {
    // Falso éxito silencioso: nunca se llama a send().
    return wantsJson(request)
      ? jsonResponse(200, { ok: true })
      : redirectResponse(sentRedirect);
  }

  const validation = validateContact({
    name: formData.get("name"),
    email: formData.get("email"),
    message: formData.get("message"),
  });

  if (!validation.ok) {
    return wantsJson(request)
      ? jsonResponse(422, { ok: false, errors: validation.errors })
      : redirectResponse(errorRedirect);
  }

  if (!deps.config) {
    return wantsJson(request)
      ? jsonResponse(503, { ok: false, error: "not_configured" })
      : redirectResponse(errorRedirect);
  }

  const result = await deps.send(validation.data, deps.config);

  if (!result.ok) {
    return wantsJson(request)
      ? jsonResponse(502, { ok: false, error: "send_failed" })
      : redirectResponse(errorRedirect);
  }

  return wantsJson(request)
    ? jsonResponse(200, { ok: true })
    : redirectResponse(sentRedirect);
}
