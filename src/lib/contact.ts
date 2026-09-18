/**
 * Validación del formulario de contacto, compartida entre el endpoint
 * y sus tests. No depende de Astro ni de red: solo transforma datos.
 */

export interface ContactInput {
  name: string;
  email: string;
  message: string;
}

/**
 * Códigos que puede devolver cada campo, declarados por separado en vez
 * de como una única unión: así el mapa de textos de la interfaz se puede
 * exigir completo campo a campo, sin obligar a inventar mensajes para
 * combinaciones que su validador nunca produce.
 */
export interface ContactFieldErrors {
  name: "required" | "invalid_characters" | "too_short" | "too_long";
  email: "required" | "too_long" | "invalid_email";
  message: "required" | "too_short" | "too_long";
}

export type ContactFieldError = ContactFieldErrors[keyof ContactFieldErrors];

export type ContactErrors = Partial<{
  [Field in keyof ContactFieldErrors]: ContactFieldErrors[Field];
}>;

/** Un texto por cada código que ese campo puede devolver, ni uno menos. */
export type ContactErrorMessages = {
  [Field in keyof ContactFieldErrors]: Record<
    ContactFieldErrors[Field],
    string
  >;
};

export type ContactValidationResult =
  { ok: true; data: ContactInput } | { ok: false; errors: ContactErrors };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTROL_CHARS_PATTERN = /[\r\n]/;

/**
 * Longitudes admitidas por campo. Es la única declaración: el formulario
 * deriva de aquí sus atributos minlength/maxlength, de modo que la
 * validación nativa del navegador no pueda contradecir a la del servidor.
 * Nombre y apellido: "Ana Lopez" son 9 caracteres, "Ana Li" son 6.
 */
export const CONTACT_LIMITS = {
  name: { min: 5, max: 100 },
  email: { max: 254 },
  message: { min: 10, max: 2000 },
} as const;

const { name: NAME, email: EMAIL, message: MESSAGE } = CONTACT_LIMITS;

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function validateName(name: string): ContactFieldErrors["name"] | null {
  if (!name) {
    return "required";
  }
  if (CONTROL_CHARS_PATTERN.test(name)) {
    return "invalid_characters";
  }
  if (name.length < NAME.min) {
    return "too_short";
  }
  if (name.length > NAME.max) {
    return "too_long";
  }
  return null;
}

function validateEmail(email: string): ContactFieldErrors["email"] | null {
  if (!email) {
    return "required";
  }
  if (email.length > EMAIL.max) {
    return "too_long";
  }
  if (!EMAIL_PATTERN.test(email)) {
    return "invalid_email";
  }
  return null;
}

function validateMessage(
  message: string,
): ContactFieldErrors["message"] | null {
  if (!message) {
    return "required";
  }
  if (message.length < MESSAGE.min) {
    return "too_short";
  }
  if (message.length > MESSAGE.max) {
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

  const errors: ContactErrors = {};

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
