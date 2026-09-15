/**
 * Validación del formulario de contacto, compartida entre el endpoint
 * y sus tests. No depende de Astro ni de red: solo transforma datos.
 */

export interface ContactInput {
  name: string;
  email: string;
  message: string;
}

export type ContactFieldError =
  | "required"
  | "too_short"
  | "too_long"
  | "invalid_email"
  | "invalid_characters";

export type ContactValidationResult =
  | { ok: true; data: ContactInput }
  | {
      ok: false;
      errors: Partial<Record<keyof ContactInput, ContactFieldError>>;
    };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTROL_CHARS_PATTERN = /[\r\n]/;

const NAME_MIN = 2;
const NAME_MAX = 100;
const EMAIL_MAX = 254;
const MESSAGE_MIN = 10;
const MESSAGE_MAX = 2000;

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Valida un payload desconocido (formData o JSON) como los tres campos
 * del formulario de contacto. Nunca lanza: siempre narrowing explícito.
 */
export function validateContact(input: unknown): ContactValidationResult {
  if (typeof input !== "object" || input === null) {
    return {
      ok: false,
      errors: { name: "required", email: "required", message: "required" },
    };
  }

  const record = input as Record<string, unknown>;
  const name = readString(record.name);
  const email = readString(record.email);
  const message = readString(record.message);

  const errors: Partial<Record<keyof ContactInput, ContactFieldError>> = {};

  if (!name) {
    errors.name = "required";
  } else if (CONTROL_CHARS_PATTERN.test(name)) {
    errors.name = "invalid_characters";
  } else if (name.length < NAME_MIN) {
    errors.name = "too_short";
  } else if (name.length > NAME_MAX) {
    errors.name = "too_long";
  }

  if (!email) {
    errors.email = "required";
  } else if (email.length > EMAIL_MAX) {
    errors.email = "too_long";
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = "invalid_email";
  }

  if (!message) {
    errors.message = "required";
  } else if (message.length < MESSAGE_MIN) {
    errors.message = "too_short";
  } else if (message.length > MESSAGE_MAX) {
    errors.message = "too_long";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, data: { name, email, message } };
}

/**
 * Comprueba el honeypot ("company" debe llegar vacío) y el tiempo
 * mínimo transcurrido desde que se pintó el formulario. Ambas señales
 * son heurísticas anti-spam básicas, no autenticación.
 */
export function isLikelySpam(
  honeypot: unknown,
  startedAt: unknown,
  now: number = Date.now(),
  minElapsedMs = 3000,
): boolean {
  if (readString(honeypot) !== "") {
    return true;
  }

  if (typeof startedAt !== "string" || startedAt === "") {
    return false;
  }

  const startedAtMs = Number(startedAt);
  if (!Number.isFinite(startedAtMs)) {
    return false;
  }

  return now - startedAtMs < minElapsedMs;
}
