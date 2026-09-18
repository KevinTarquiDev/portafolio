import { isLikelySpam, validateContact } from "./contact";
import type { BrevoConfig, ContactEmailInput, SendResult } from "./brevo";
import { isLocale, defaultLocale } from "../i18n/config";

/**
 * Lógica HTTP de /api/contact, independiente de Astro para poder
 * testearla sin red ni request reales. api/contact.ts solo conecta
 * esto con astro:env y sendContactEmail.
 *
 * El Origin no se comprueba aquí: `security.checkOrigin` de Astro está
 * activo por defecto y rechaza con 403 cualquier POST de formulario cuyo
 * Origin no sea el propio sitio, antes de que la petición llegue hasta
 * este handler.
 */

export interface ContactHandlerDeps {
  /** null cuando falta configuración server-side requerida (503). */
  config: BrevoConfig | null;
  send: (input: ContactEmailInput, config: BrevoConfig) => Promise<SendResult>;
  /**
   * Registra el envío y devuelve true si el remitente supera su cuota.
   * Se inyecta, igual que `send`, para que los tests no dependan del
   * contador en memoria del proceso.
   */
  rateLimit: (request: Request) => boolean;
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

function readLocaleField(formData: FormData): string {
  const value = formData.get("locale");
  return typeof value === "string" && isLocale(value) ? value : defaultLocale;
}

export async function handleContactRequest(
  request: Request,
  deps: ContactHandlerDeps,
): Promise<Response> {
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
    // Falso éxito silencioso: nunca se llama a send(). Al visitante no se
    // le avisa a propósito (delataría la heurística a un bot), pero sí
    // queda rastro: la heurística también puede descartar mensajes reales
    // y sin este registro no habría forma de detectarlo.
    console.warn("[contact] descartado por heurística anti-spam");
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

  // Se cuenta aquí, no antes: así los intentos que fallan la validación no
  // gastan cuota y el visitante que corrige una errata no queda bloqueado.
  if (deps.rateLimit(request)) {
    return wantsJson(request)
      ? jsonResponse(429, { ok: false, error: "rate_limited" })
      : redirectResponse(errorRedirect);
  }

  const result = await deps.send(validation.data, deps.config);

  if (!result.ok) {
    // La respuesta al visitante es genérica a propósito, pero `reason` y
    // `status` son la única pista de si falló la API (401, 429…) o la red.
    // Sin registrarlos aquí se calculaban para tirarlos.
    const detail = result.status
      ? `${result.reason} (${result.status})`
      : result.reason;
    console.error(`[contact] envío fallido: ${detail}`);
    return wantsJson(request)
      ? jsonResponse(502, { ok: false, error: "send_failed" })
      : redirectResponse(errorRedirect);
  }

  return wantsJson(request)
    ? jsonResponse(200, { ok: true })
    : redirectResponse(sentRedirect);
}
