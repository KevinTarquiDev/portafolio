/**
 * Mejora progresiva del formulario de contacto: intercepta el submit
 * para enviarlo por fetch y mostrar el resultado sin recargar la
 * página. Sin JS, el formulario sigue funcionando por su `action`
 * normal (ver src/pages/[locale]/contact/sent.astro y error.astro).
 */

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

  form.addEventListener("submit", (event) => {
    if (!form.reportValidity()) {
      return;
    }
    event.preventDefault();
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
  clearFieldErrors(form);
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
        errors?: Record<string, string>;
      };
      applyFieldErrors(form, body.errors ?? {}, messages);
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

function clearFieldErrors(form: HTMLFormElement): void {
  for (const field of ["name", "email", "message"] as const) {
    const errorEl = form.querySelector<HTMLElement>(`#contact-${field}-error`);
    if (errorEl) {
      errorEl.textContent = "";
    }
    form
      .querySelector<HTMLElement>(`#contact-${field}`)
      ?.removeAttribute("aria-invalid");
  }
}

function applyFieldErrors(
  form: HTMLFormElement,
  errors: Record<string, string>,
  messages: ContactMessages,
): void {
  let firstInvalid: HTMLElement | null = null;

  for (const field of ["name", "email", "message"] as const) {
    const code = errors[field];
    if (!code) {
      continue;
    }
    const errorEl = form.querySelector<HTMLElement>(`#contact-${field}-error`);
    const input = form.querySelector<HTMLElement>(`#contact-${field}`);
    const text = messages.errors[field][code] ?? messages.genericError;
    if (errorEl) {
      errorEl.textContent = text;
    }
    if (input) {
      input.setAttribute("aria-invalid", "true");
      firstInvalid ??= input;
    }
  }

  firstInvalid?.focus();
}
