/**
 * Mejora progresiva del formulario de contacto: valida los campos en
 * tiempo real (mismas reglas que el servidor, vía lib/contact) e
 * intercepta el submit para enviarlo por fetch sin recargar la página.
 * Sin JS, el formulario sigue funcionando por su `action` normal (ver
 * src/pages/[locale]/contact/sent.astro y error.astro), y el servidor
 * vuelve a validar todo de forma independiente.
 */
import { validateContactField } from "../lib/contact";
import type { ContactInput } from "../lib/contact";

type Field = keyof ContactInput;

const FIELDS: readonly Field[] = ["name", "email", "message"];

/**
 * Copia en cliente del bloque JSON que pinta ContactForm.astro. Los mapas
 * de error se tipan por clave de texto, no con los códigos exactos: aquí
 * el dato viene de JSON y se valida en runtime (ver parseMessages), y la
 * exhaustividad ya la garantiza el componente al construirlo.
 */
interface ContactMessages {
  success: string;
  submitting: string;
  submit: string;
  genericError: string;
  rateLimited: string;
  errors: {
    name: Record<string, string>;
    email: Record<string, string>;
    message: Record<string, string>;
  };
}

const form = document.getElementById("contact-form");
if (form instanceof HTMLFormElement) {
  initContactForm(form);
}

function initContactForm(form: HTMLFormElement): void {
  // Con JS, la validación (y su UI) es la nuestra: si se deja la nativa
  // del navegador, su burbuja bloquea el evento "submit" y nuestros
  // mensajes/estilos de error nunca llegan a mostrarse. Sin JS, esta
  // línea no se ejecuta y el navegador valida con los atributos nativos.
  form.noValidate = true;

  const startedAtInput = form.querySelector<HTMLInputElement>(
    "[data-contact-started-at]",
  );
  if (startedAtInput) {
    startedAtInput.value = String(Date.now());
  }

  const messagesScript = form.parentElement?.querySelector<HTMLScriptElement>(
    "[data-contact-messages]",
  );
  const messages = parseMessages(messagesScript?.textContent);
  if (!messages) {
    return;
  }

  const submitButton = form.querySelector<HTMLButtonElement>(
    "button[type='submit']",
  );
  const submitLabel = form.querySelector<HTMLElement>(
    "[data-contact-submit-label]",
  );
  const ui: FormUi = {
    submitButton,
    submitLabel,
    status: form.querySelector<HTMLElement>("[data-contact-status]"),
    announcer: form.querySelector<HTMLElement>("[data-contact-announcer]"),
  };

  for (const field of FIELDS) {
    const input = getFieldInput(form, field);
    if (!input) {
      continue;
    }

    // Mientras se escribe, solo se retira el error si ya se corrigió:
    // no se interrumpe al usuario con un error nuevo a media escritura.
    input.addEventListener("input", () => {
      if (input.getAttribute("aria-invalid") !== "true") {
        return;
      }
      const error = validateContactField(field, input.value);
      if (!error) {
        clearFieldError(form, field);
      }
    });

    // Al salir del campo sí se revela el error, si lo hay.
    input.addEventListener("blur", () => {
      validateFieldAndReport(form, field, messages, { shake: true });
    });
  }

  // El botón ya no se deshabilita durante el envío (ver setBusy), así que
  // el reenvío lo frena esta bandera y no el estado del control.
  let submitting = false;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (submitting) {
      return;
    }

    let firstInvalid: HTMLElement | null = null;
    for (const field of FIELDS) {
      const valid = validateFieldAndReport(form, field, messages, {
        shake: true,
      });
      if (!valid) {
        firstInvalid ??= getFieldInput(form, field);
      }
    }

    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    submitting = true;
    void submitForm(form, messages, ui).finally(() => {
      submitting = false;
    });
  });
}

function isStringMap(value: unknown): value is Record<string, string> {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.values(value).every((entry) => typeof entry === "string")
  );
}

/**
 * Comprueba la forma del JSON en vez de afirmarla: si el bloque de
 * mensajes cambiara, el formulario se queda sin mejora progresiva (sigue
 * funcionando por POST normal) en lugar de romperse al primer envío.
 */
function parseMessages(raw: string | null | undefined): ContactMessages | null {
  if (!raw) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) {
    return null;
  }

  const { success, submitting, submit, genericError, rateLimited, errors } =
    parsed as Record<string, unknown>;
  if (
    typeof success !== "string" ||
    typeof submitting !== "string" ||
    typeof submit !== "string" ||
    typeof genericError !== "string" ||
    typeof rateLimited !== "string" ||
    typeof errors !== "object" ||
    errors === null
  ) {
    return null;
  }

  const byField = errors as Record<string, unknown>;
  const name = byField.name;
  const email = byField.email;
  const message = byField.message;
  if (!isStringMap(name) || !isStringMap(email) || !isStringMap(message)) {
    return null;
  }

  return {
    success,
    submitting,
    submit,
    genericError,
    rateLimited,
    errors: { name, email, message },
  };
}

interface FormUi {
  submitButton: HTMLButtonElement | null;
  submitLabel: HTMLElement | null;
  status: HTMLElement | null;
  announcer: HTMLElement | null;
}

async function submitForm(
  form: HTMLFormElement,
  messages: ContactMessages,
  ui: FormUi,
): Promise<void> {
  setBusy(form, ui, messages.submitting, true);

  try {
    const response = await fetch(form.action, {
      method: "POST",
      body: new FormData(form),
      headers: { accept: "application/json" },
    });

    if (response.ok) {
      setStatus(ui, messages.success);
      form.reset();
      clearFieldErrors(form);
      const startedAtInput = form.querySelector<HTMLInputElement>(
        "[data-contact-started-at]",
      );
      if (startedAtInput) {
        startedAtInput.value = String(Date.now());
      }
      return;
    }

    if (response.status === 422) {
      const applied = applyServerErrors(
        form,
        await readFieldErrors(response),
        messages,
      );
      // El 422 cubre también los cuerpos ilegibles, que no traen ningún
      // error de campo: sin este aviso el envío fallaría en silencio.
      setStatus(ui, applied ? "" : messages.genericError);
      return;
    }

    if (response.status === 429) {
      setStatus(ui, messages.rateLimited);
      return;
    }

    setStatus(ui, messages.genericError);
  } catch {
    setStatus(ui, messages.genericError);
  } finally {
    setBusy(form, ui, messages.submit, false);
  }
}

/** Códigos de error por campo de una respuesta 422, ignorando el resto. */
async function readFieldErrors(
  response: Response,
): Promise<Partial<Record<Field, string>>> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return {};
  }
  if (typeof body !== "object" || body === null) {
    return {};
  }

  const errors = (body as Record<string, unknown>).errors;
  if (typeof errors !== "object" || errors === null) {
    return {};
  }

  const source = errors as Record<string, unknown>;
  const out: Partial<Record<Field, string>> = {};
  for (const field of FIELDS) {
    const code = source[field];
    if (typeof code === "string") {
      out[field] = code;
    }
  }
  return out;
}

function setBusy(
  form: HTMLFormElement,
  ui: FormUi,
  label: string,
  busy: boolean,
): void {
  form.setAttribute("aria-busy", String(busy));
  if (ui.submitButton) {
    // aria-disabled en vez de disabled: deshabilitar el botón recién
    // pulsado le quita el foco, y el lector de pantalla pierde el hilo
    // justo cuando va a anunciarse el resultado.
    ui.submitButton.setAttribute("aria-disabled", String(busy));
  }
  if (ui.submitLabel) {
    ui.submitLabel.textContent = label;
  }
}

function setStatus(ui: FormUi, text: string): void {
  if (ui.status) {
    ui.status.textContent = text;
  }
  if (ui.announcer) {
    ui.announcer.textContent = text;
  }
}

function getFieldInput(
  form: HTMLFormElement,
  field: Field,
): HTMLInputElement | HTMLTextAreaElement | null {
  return form.querySelector<HTMLInputElement | HTMLTextAreaElement>(
    `#contact-${field}`,
  );
}

function getFieldError(
  form: HTMLFormElement,
  field: Field,
): HTMLElement | null {
  return form.querySelector<HTMLElement>(`#contact-${field}-error`);
}

/**
 * Valida un campo con las mismas reglas del servidor y refleja el
 * resultado en el input y su mensaje. Devuelve si el campo es válido.
 */
function validateFieldAndReport(
  form: HTMLFormElement,
  field: Field,
  messages: ContactMessages,
  options: { shake: boolean },
): boolean {
  const input = getFieldInput(form, field);
  if (!input) {
    return true;
  }

  const error = validateContactField(field, input.value);
  if (!error) {
    clearFieldError(form, field);
    return true;
  }

  const wasAlreadyInvalid = input.getAttribute("aria-invalid") === "true";
  const text = messages.errors[field][error] ?? messages.genericError;
  showFieldError(form, field, text);
  if (options.shake && !wasAlreadyInvalid) {
    shakeField(input);
  }
  return false;
}

function showFieldError(
  form: HTMLFormElement,
  field: Field,
  text: string,
): void {
  const input = getFieldInput(form, field);
  const errorEl = getFieldError(form, field);
  if (errorEl) {
    errorEl.textContent = text;
  }
  input?.setAttribute("aria-invalid", "true");
}

function clearFieldError(form: HTMLFormElement, field: Field): void {
  const errorEl = getFieldError(form, field);
  if (errorEl) {
    errorEl.textContent = "";
  }
  getFieldInput(form, field)?.removeAttribute("aria-invalid");
}

function clearFieldErrors(form: HTMLFormElement): void {
  for (const field of FIELDS) {
    clearFieldError(form, field);
  }
}

/** Reinicia y relanza la animación de shake aunque ya estuviera en curso. */
function shakeField(input: HTMLElement): void {
  input.classList.remove("field-shake");
  // Fuerza reflow para poder reiniciar la animación desde cero.
  void input.offsetWidth;
  input.classList.add("field-shake");
}

/** Refleja los errores del servidor y devuelve si alguno era de campo. */
function applyServerErrors(
  form: HTMLFormElement,
  errors: Partial<Record<Field, string>>,
  messages: ContactMessages,
): boolean {
  let firstInvalid: HTMLElement | null = null;

  for (const field of FIELDS) {
    const code = errors[field];
    if (!code) {
      clearFieldError(form, field);
      continue;
    }
    const text = messages.errors[field][code] ?? messages.genericError;
    showFieldError(form, field, text);
    firstInvalid ??= getFieldInput(form, field);
  }

  firstInvalid?.focus();
  return firstInvalid !== null;
}
