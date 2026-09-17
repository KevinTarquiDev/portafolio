import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Verifica el build de producción (`.vercel/output`) más allá de lo que
 * cubre `astro check`: contenido HTML real, redirects, funciones y
 * artefactos generados. Cada comprobación se nombra por lo que valida y
 * se registra en CHECKS; añadir una nueva es escribir su función y
 * sumarla a esa lista. Sale con código 1 si algo falla, listando todos
 * los fallos encontrados.
 */

const OUTPUT_DIR = ".vercel/output";
const STATIC_DIR = join(OUTPUT_DIR, "static");
const CONFIG_PATH = join(OUTPUT_DIR, "config.json");

const failures: string[] = [];

function fail(message: string): void {
  failures.push(message);
}

function readText(path: string): string | null {
  if (!existsSync(path)) {
    return null;
  }
  return readFileSync(path, "utf8");
}

function walkFiles(dir: string): string[] {
  if (!existsSync(dir)) {
    return [];
  }
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      files.push(...walkFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Rutas /es/ y /en/ generadas con lang correcto, redirect "/" -> "/es/"
 * en config.json, y ninguna fuente cargada desde Google Fonts.
 */
function checkRoutes(): void {
  const esHtml = readText(join(STATIC_DIR, "es", "index.html"));
  if (!esHtml) {
    fail("Falta static/es/index.html");
  } else if (!esHtml.includes('<html lang="es"')) {
    fail('static/es/index.html no declara <html lang="es">');
  }

  const enHtml = readText(join(STATIC_DIR, "en", "index.html"));
  if (!enHtml) {
    fail("Falta static/en/index.html");
  } else if (!enHtml.includes('<html lang="en"')) {
    fail('static/en/index.html no declara <html lang="en">');
  }

  const config = readText(CONFIG_PATH);
  if (!config) {
    fail("Falta .vercel/output/config.json");
  } else {
    const hasRootRedirect =
      /"src":\s*"\^\/\$"[\s\S]*?"Location":\s*"\/es\/"/.test(config);
    if (!hasRootRedirect) {
      fail('config.json no contiene el redirect "/" -> "/es/"');
    }
  }

  const staticFiles = walkFiles(STATIC_DIR);
  const googleFontsFiles = staticFiles.filter((file) => {
    if (!file.endsWith(".html") && !file.endsWith(".css")) {
      return false;
    }
    const content = readFileSync(file, "utf8");
    return (
      content.includes("fonts.googleapis.com") ||
      content.includes("fonts.gstatic.com")
    );
  });
  for (const file of googleFontsFiles) {
    fail(`${file} referencia Google Fonts (las fuentes deben autoalojarse)`);
  }
}

/**
 * La función serverless que atiende /api/contact/ existe en el config
 * de Vercel.
 */
function checkContactFunction(): void {
  const config = readText(CONFIG_PATH);
  if (!config) {
    fail("Falta .vercel/output/config.json");
    return;
  }

  const hasContactRoute =
    /"src":\s*"\^\/api\/contact\/\$"[\s\S]*?"dest":\s*"_render"/.test(config);
  if (!hasContactRoute) {
    fail('config.json no enruta "/api/contact/" a una función on-demand');
  }

  const functionsDir = join(OUTPUT_DIR, "functions");
  if (!existsSync(functionsDir)) {
    fail(
      "Falta .vercel/output/functions: no se generó ninguna función on-demand",
    );
  }
}

/**
 * Los PDF del CV existen, son PDFs válidos, y el href del botón
 * "Descargar CV" en cada idioma apunta al PDF de ese idioma.
 */
function checkCvPdfs(): void {
  const pdfPaths = {
    es: join(STATIC_DIR, "cv", "kevin-tarqui-cv-es.pdf"),
    en: join(STATIC_DIR, "cv", "kevin-tarqui-cv-en.pdf"),
  } as const;

  for (const [locale, pdfPath] of Object.entries(pdfPaths)) {
    if (!existsSync(pdfPath)) {
      fail(`Falta el CV en PDF para "${locale}": ${pdfPath}`);
      continue;
    }
    const header = readFileSync(pdfPath).subarray(0, 5).toString("ascii");
    if (header !== "%PDF-") {
      fail(`${pdfPath} no parece un PDF válido (cabecera "${header}")`);
    }
  }

  const htmlPaths = {
    es: join(STATIC_DIR, "es", "index.html"),
    en: join(STATIC_DIR, "en", "index.html"),
  } as const;

  for (const [locale, htmlPath] of Object.entries(htmlPaths)) {
    const html = readText(htmlPath);
    if (!html) {
      continue; // ya reportado por checkRoutes
    }
    const expectedHref = `/cv/kevin-tarqui-cv-${locale}.pdf`;
    if (!html.includes(expectedHref)) {
      fail(`${htmlPath} no enlaza a ${expectedHref}`);
    }
  }
}

/**
 * Canonical y hreflang recíprocos, meta OG/Twitter con URLs absolutas,
 * JSON-LD parseable, sitemap y robots correctos, y og-image presente.
 */
function checkSeo(): void {
  const htmlPaths = {
    es: join(STATIC_DIR, "es", "index.html"),
    en: join(STATIC_DIR, "en", "index.html"),
  } as const;

  for (const [locale, htmlPath] of Object.entries(htmlPaths)) {
    const html = readText(htmlPath);
    if (!html) {
      continue; // ya reportado por checkRoutes
    }

    const [, canonical] =
      /<link rel="canonical" href="([^"]+)"/.exec(html) ?? [];
    if (!canonical) {
      fail(`${htmlPath}: falta <link rel="canonical">`);
    } else if (!canonical.endsWith(`/${locale}/`)) {
      fail(`${htmlPath}: canonical "${canonical}" no apunta a /${locale}/`);
    }

    for (const hreflang of ["es", "en", "x-default"]) {
      if (!html.includes(`hreflang="${hreflang}"`)) {
        fail(`${htmlPath}: falta hreflang="${hreflang}"`);
      }
    }

    for (const property of [
      'property="og:title"',
      'property="og:description"',
      'property="og:image"',
      'property="og:url"',
      'name="twitter:card"',
    ]) {
      if (!html.includes(property)) {
        fail(`${htmlPath}: falta meta ${property}`);
      }
    }
    if (!html.includes("og:image") || !html.includes("https://")) {
      fail(`${htmlPath}: og:image debería ser una URL absoluta`);
    }

    const [, jsonLd] =
      /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/.exec(
        html,
      ) ?? [];
    if (!jsonLd) {
      fail(`${htmlPath}: falta el script JSON-LD`);
    } else {
      try {
        const parsed = JSON.parse(jsonLd) as Record<string, unknown>;
        if (parsed["@type"] !== "Person") {
          fail(`${htmlPath}: JSON-LD no es @type Person`);
        }
      } catch {
        fail(`${htmlPath}: el JSON-LD no es JSON válido`);
      }
    }
  }

  const sitemap = readText(join(STATIC_DIR, "sitemap.xml"));
  if (!sitemap) {
    fail("Falta static/sitemap.xml");
  } else {
    if (!sitemap.includes("/es/") || !sitemap.includes("/en/")) {
      fail("sitemap.xml no incluye /es/ y /en/");
    }
  }

  const robots = readText(join(STATIC_DIR, "robots.txt"));
  if (!robots) {
    fail("Falta static/robots.txt");
  } else if (!robots.includes("Sitemap:")) {
    fail("robots.txt no incluye la línea Sitemap:");
  }

  if (!existsSync(join(STATIC_DIR, "og-image.png"))) {
    fail("Falta static/og-image.png");
  }
}

/**
 * `vercel.json` existe, es JSON válido y declara las cabeceras de
 * seguridad y cache esperadas; el cache immutable de `/_astro/*` ya lo
 * escribe el propio adaptador en config.json. Las cabeceras de
 * `vercel.json` las aplica la plataforma de Vercel en el despliegue
 * real (no las fusiona el adaptador en config.json), así que aquí solo
 * se valida el archivo fuente.
 */
function checkHeaders(): void {
  const vercelJsonRaw = readText("vercel.json");
  if (!vercelJsonRaw) {
    fail("Falta vercel.json en la raíz del repo");
    return;
  }

  let vercelJson: {
    headers?: Array<{
      source: string;
      headers: Array<{ key: string; value: string }>;
    }>;
  };
  try {
    vercelJson = JSON.parse(vercelJsonRaw);
  } catch {
    fail("vercel.json no es JSON válido");
    return;
  }

  const allHeaderKeys = (vercelJson.headers ?? []).flatMap((rule) =>
    rule.headers.map((h) => h.key),
  );
  const requiredKeys = [
    "X-Content-Type-Options",
    "Referrer-Policy",
    "X-Frame-Options",
    "Permissions-Policy",
  ];
  for (const key of requiredKeys) {
    if (!allHeaderKeys.includes(key)) {
      fail(`vercel.json no declara la cabecera "${key}"`);
    }
  }

  const config = readText(CONFIG_PATH);
  if (config) {
    const hasImmutableAstroCache =
      /"src":\s*"\^\/_astro\/[^"]*"[\s\S]*?"cache-control":\s*"public, max-age=31536000, immutable"/.test(
        config,
      );
    if (!hasImmutableAstroCache) {
      fail(
        "config.json no aplica cache-control immutable a /_astro/* (lo genera el adaptador)",
      );
    }
  }
}

const CHECKS = [
  checkRoutes,
  checkContactFunction,
  checkCvPdfs,
  checkSeo,
  checkHeaders,
];

for (const check of CHECKS) {
  check();
}

if (failures.length > 0) {
  console.error("❌ check-build encontró problemas:\n");
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  process.exit(1);
}

console.log("✅ check-build: todas las comprobaciones pasaron");
