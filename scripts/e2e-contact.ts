/**
 * Prueba end-to-end real de /api/contact/ contra un servidor
 * `astro dev` en marcha (con el .env real cargado). Envía peticiones
 * reales; con datos válidos, esto SÍ dispara un correo real vía
 * Brevo. Nunca imprime valores de variables de entorno.
 *
 * Uso:
 *   bun run dev &            (en otra terminal)
 *   bun scripts/e2e-contact.ts --base http://localhost:4321
 */

const baseArgIndex = process.argv.indexOf("--base");
const BASE_URL =
  baseArgIndex !== -1 && process.argv[baseArgIndex + 1]
    ? process.argv[baseArgIndex + 1]
    : "http://localhost:4321";

let passed = 0;
let failed = 0;

function report(name: string, ok: boolean, detail?: string): void {
  if (ok) {
    passed++;
    console.log(`✅ ${name}`);
  } else {
    failed++;
    console.error(`❌ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function uniqueEmail(): string {
  return `e2e-${Date.now()}@example.com`;
}

async function postContact(
  fields: Record<string, string>,
  options: { accept?: string; origin?: string } = {},
): Promise<Response> {
  const body = new URLSearchParams(fields);
  const headers: Record<string, string> = {
    "content-type": "application/x-www-form-urlencoded",
    // Un navegador real siempre manda Origin en un POST de formulario;
    // Astro exige que coincida con el propio origen (security.checkOrigin),
    // así que lo simulamos aquí salvo que la prueba quiera uno distinto.
    origin: options.origin ?? new URL(BASE_URL).origin,
  };
  if (options.accept) headers.accept = options.accept;

  return fetch(`${BASE_URL}/api/contact/`, {
    method: "POST",
    headers,
    body: body.toString(),
    redirect: "manual",
  });
}

const validFields = () => ({
  name: "Prueba E2E",
  email: uniqueEmail(),
  message:
    "Este es un mensaje de prueba end-to-end del formulario de contacto.",
  locale: "es",
  company: "",
  startedAt: String(Date.now() - 5000),
});

async function main(): Promise<void> {
  console.log(`Probando ${BASE_URL}/api/contact/\n`);

  // 1. Envío válido -> Brevo debe aceptarlo (200 implica 2xx de Brevo).
  const validResponse = await postContact(validFields(), {
    accept: "application/json",
  });
  report(
    "envío válido responde 200 (Brevo aceptó el mensaje)",
    validResponse.status === 200,
    `status=${validResponse.status}`,
  );

  // 2. Campos vacíos -> 422 con errores por campo.
  const invalidResponse = await postContact(
    { name: "", email: "no-valido", message: "", locale: "es" },
    { accept: "application/json" },
  );
  const invalidBody = (await invalidResponse.json().catch(() => null)) as {
    errors?: Record<string, string>;
  } | null;
  report(
    "campos inválidos responde 422 con errores por campo",
    invalidResponse.status === 422 &&
      invalidBody?.errors?.name === "required" &&
      invalidBody?.errors?.email === "invalid_email",
    `status=${invalidResponse.status} body=${JSON.stringify(invalidBody)}`,
  );

  // 3. Honeypot relleno -> éxito aparente, sin enviar de verdad.
  const honeypotFields = validFields();
  honeypotFields.company = "soy un bot";
  const honeypotResponse = await postContact(honeypotFields, {
    accept: "application/json",
  });
  report(
    "honeypot relleno responde éxito sin enviar",
    honeypotResponse.status === 200,
    `status=${honeypotResponse.status}`,
  );

  // 4. Origin ajeno -> 403.
  const originResponse = await postContact(validFields(), {
    accept: "application/json",
    origin: "https://evil.example",
  });
  report(
    "Origin ajeno responde 403",
    originResponse.status === 403,
    `status=${originResponse.status}`,
  );

  // 5. Sin JS (sin accept: application/json) -> 303 a .../contact/sent/.
  const noJsResponse = await postContact(validFields());
  const location = noJsResponse.headers.get("location");
  report(
    "envío sin JS redirige (303) a /es/contact/sent/",
    noJsResponse.status === 303 && location === "/es/contact/sent/",
    `status=${noJsResponse.status} location=${location}`,
  );

  console.log(`\n${passed} pasaron, ${failed} fallaron`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

void main();
