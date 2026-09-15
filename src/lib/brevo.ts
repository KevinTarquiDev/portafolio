/**
 * Envío del correo de contacto vía la API transaccional de Brevo.
 * No registra nunca el contenido del mensaje ni la API key: si Brevo
 * falla, solo se propaga un código de error genérico.
 */

export interface BrevoConfig {
  apiKey: string;
  senderEmail: string;
  senderName: string;
  recipientEmail: string;
}

export interface ContactEmailInput {
  name: string;
  email: string;
  message: string;
}

export type SendResult =
  | { ok: true }
  | { ok: false; status?: number; reason: "http_error" | "network_error" };

/**
 * Nombre del remitente que se muestra en el correo: el configurado en
 * CONTACT_SENDER_NAME, o si falta, el x-displayName del resume.
 */
export function resolveSenderName(
  configuredName: string | undefined,
  fallbackDisplayName: string,
): string {
  return configuredName && configuredName.trim() !== ""
    ? configuredName
    : fallbackDisplayName;
}

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";
const REQUEST_TIMEOUT_MS = 8000;

/**
 * Envía el mensaje de contacto. `fetchImpl` es inyectable para poder
 * testear sin red real.
 */
export async function sendContactEmail(
  input: ContactEmailInput,
  config: BrevoConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<SendResult> {
  const payload = buildBrevoPayload(input, config);

  try {
    const response = await fetchImpl(BREVO_ENDPOINT, {
      method: "POST",
      headers: {
        "api-key": config.apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      return { ok: false, status: response.status, reason: "http_error" };
    }

    return { ok: true };
  } catch {
    return { ok: false, reason: "network_error" };
  }
}

/**
 * Construye el payload exacto que se envía a Brevo, sin hacer la
 * petición. Se usa en tests para verificar sender/to/replyTo sin
 * mockear fetch.
 */
export function buildBrevoPayload(
  input: ContactEmailInput,
  config: BrevoConfig,
): {
  sender: { name: string; email: string };
  to: Array<{ email: string }>;
  replyTo: { email: string; name: string };
  subject: string;
  textContent: string;
} {
  return {
    sender: { name: config.senderName, email: config.senderEmail },
    to: [{ email: config.recipientEmail }],
    replyTo: { email: input.email, name: input.name },
    subject: `Portfolio · ${input.name}`,
    textContent: input.message,
  };
}
