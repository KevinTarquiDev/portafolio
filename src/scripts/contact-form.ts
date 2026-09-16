/**
 * Mejora progresiva del formulario de contacto: valida los campos en
 * tiempo real (mismas reglas que el servidor, vía lib/contact) e
 * intercepta el submit para enviarlo por fetch sin recargar la página.
 * Sin JS, el formulario sigue funcionando por su `action` normal (ver
 * src/pages/[locale]/contact/sent.astro y error.astro), y el servidor
 * vuelve a validar todo de forma independiente.
 */
import { validateContactField } from "../lib/contact";
import type { ContactFieldError, ContactInput } from "../lib/contact";

type Field = keyof ContactInput;

const FIELDS: readonly Field[] = ["name", "email", "message"];

interface ContactMessages {
  success: string;
  submitting: string;
  submit: string;
  genericError: string;
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
  const status = form.querySelector<HTMLElement>("[data-contact-status]");

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

  form.addEventListener("submit", (event) => {
    event.preventDefault();

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

    void submitForm(form, messages, { submitButton, submitLabel, status });
  });
}

function parseMessages(raw: string | null | undefined): ContactMessages | null {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as ContactMessages;
  } catch {
    return null;
  }
}

interface FormUi {
  submitButton: HTMLButtonElement | null;
  submitLabel: HTMLElement | null;
  status: HTMLElement | null;
}

async function submitForm(
  form: HTMLFormElement,
  messages: ContactMessages,
  ui: FormUi,
): Promise<void> {
  setBusy(ui, messages.submitting, true);

  try {
    const response = await fetch(form.action, {
      method: "POST",
      body: new FormData(form),
      headers: { accept: "application/json" },
    });

    if (response.ok) {
      setStatus(ui.status, messages.success);
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
      const body = (await response.json()) as {
        errors?: Partial<Record<Field, ContactFieldError>>;
      };
      applyServerErrors(form, body.errors ?? {}, messages);
      setStatus(ui.status, "");
      return;
    }

    setStatus(ui.status, messages.genericError);
  } catch {
    setStatus(ui.status, messages.genericError);
  } finally {
    setBusy(ui, messages.submit, false);
  }
}

function setBusy(ui: FormUi, label: string, busy: boolean): void {
  if (ui.submitButton) {
    ui.submitButton.disabled = busy;
  }
  if (ui.submitLabel) {
    ui.submitLabel.textContent = label;
  }
}

function setStatus(status: HTMLElement | null, text: string): void {
  if (status) {
    status.textContent = text;
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

function applyServerErrors(
  form: HTMLFormElement,
  errors: Partial<Record<Field, ContactFieldError>>,
  messages: ContactMessages,
): void {
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
}
