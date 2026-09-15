import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Verifica el build de producción (`.vercel/output`) más allá de lo que
 * cubre `astro check`: contenido HTML real, redirects, funciones y
 * artefactos generados. Cada fase de IMPLEMENTATION_PLAN.md añade sus
 * propias comprobaciones aquí; nunca se adelantan comprobaciones de
 * fases futuras. Sale con código 1 si algo falla, listando todos los
 * fallos encontrados.
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
 * Fase 2: rutas /es/ y /en/ generadas con lang correcto, redirect "/" ->
 * "/es/" en config.json, y ninguna fuente cargada desde Google Fonts.
 */
function checkPhase2(): void {
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
 * Fase 5: la función serverless que atiende /api/contact/ existe en
 * el config de Vercel.
 */
function checkPhase5(): void {
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

checkPhase2();
checkPhase5();

if (failures.length > 0) {
  console.error("❌ check-build encontró problemas:\n");
  for (const failure of failures) {
    console.error(`  - ${failure}`);
  }
  process.exit(1);
}

console.log("✅ check-build: todas las comprobaciones pasaron");
