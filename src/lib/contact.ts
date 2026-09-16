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

/** Nombre y apellido: "Ana Lopez" son 9 caracteres, "Ana Li" son 6. */
const NAME_MIN = 5;
const NAME_MAX = 100;
const EMAIL_MAX = 254;
const MESSAGE_MIN = 10;
const MESSAGE_MAX = 2000;

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function validateName(name: string): ContactFieldError | null {
  if (!name) {
    return "required";
  }
  if (CONTROL_CHARS_PATTERN.test(name)) {
    return "invalid_characters";
  }
  if (name.length < NAME_MIN) {
    return "too_short";
  }
  if (name.length > NAME_MAX) {
    return "too_long";
  }
  return null;
}

function validateEmail(email: string): ContactFieldError | null {
  if (!email) {
    return "required";
  }
  if (email.length > EMAIL_MAX) {
    return "too_long";
  }
  if (!EMAIL_PATTERN.test(email)) {
    return "invalid_email";
  }
  return null;
}

function validateMessage(message: string): ContactFieldError | null {
  if (!message) {
    return "required";
  }
  if (message.length < MESSAGE_MIN) {
    return "too_short";
  }
  if (message.length > MESSAGE_MAX) {
    return "too_long";
  }
  return null;
}

/**
 * Valida un único campo a partir de un valor desconocido. La usa tanto
 * `validateContact` como la validación en tiempo real del cliente, para
 * que ambas compartan exactamente las mismas reglas.
 */
export function validateContactField(
  field: keyof ContactInput,
  value: unknown,
): ContactFieldError | null {
  const str = readString(value);
  switch (field) {
    case "name":
      return validateName(str);
    case "email":
      return validateEmail(str);
    case "message":
      return validateMessage(str);
  }
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

  const nameError = validateName(name);
  if (nameError) {
    errors.name = nameError;
  }

  const emailError = validateEmail(email);
  if (emailError) {
    errors.email = emailError;
  }

  const messageError = validateMessage(message);
  if (messageError) {
    errors.message = messageError;
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
