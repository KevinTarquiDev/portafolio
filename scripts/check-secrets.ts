import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Busca el VALOR REAL de BREVO_API_KEY (leído de process.env, nunca
 * impreso) dentro de los artefactos generados, para confirmar que no
 * se filtró al cliente. Nunca modifica .env: solo lee process.env,
 * que Bun ya carga automáticamente.
 *
 * Uso:
 *   bun run secrets:check                 # falla si la variable falta
 *   bun run secrets:check -- --allow-missing  # la omite si falta
 */

const ALLOW_MISSING = process.argv.includes("--allow-missing");

const SCAN_DIRS = [
  join(".vercel", "output", "static"),
  join(".vercel", "output", "functions"),
  join(".vercel", "output", "_functions"),
  "dist",
  "public",
  join(".tmp", "logs"),
];

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

function findValueLeaks(secretValue: string): string[] {
  const matches: string[] = [];
  for (const dir of SCAN_DIRS) {
    for (const file of walkFiles(dir)) {
      let content: Buffer;
      try {
        content = readFileSync(file);
      } catch {
        continue;
      }
      if (content.includes(secretValue)) {
        matches.push(file);
      }
    }
  }
  return matches;
}

function findNameLeaks(variableName: string): string[] {
  const matches: string[] = [];
  const staticDir = join(".vercel", "output", "static");
  for (const file of walkFiles(staticDir)) {
    let content: string;
    try {
      content = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    if (content.includes(variableName)) {
      matches.push(file);
    }
  }
  return matches;
}

function main(): void {
  const secretValue = process.env.BREVO_API_KEY;

  if (!secretValue) {
    if (ALLOW_MISSING) {
      console.log("⚠️  OMITIDA: BREVO_API_KEY no disponible en este entorno");
      return;
    }
    console.error(
      "❌ BREVO_API_KEY no está definida: no se puede verificar la ausencia de fugas.",
    );
    console.error(
      "   Ejecuta con --allow-missing si esto es esperado en este entorno.",
    );
    process.exitCode = 1;
    return;
  }

  const valueLeaks = findValueLeaks(secretValue);
  const nameLeaks = findNameLeaks("BREVO_API_KEY");

  if (valueLeaks.length > 0) {
    console.error(
      "❌ Se encontró el VALOR de BREVO_API_KEY en artefactos generados:",
    );
    for (const file of valueLeaks) {
      console.error(`  - ${file}`);
    }
    process.exitCode = 1;
    return;
  }

  if (nameLeaks.length > 0) {
    console.error(
      "❌ El nombre literal BREVO_API_KEY aparece en el HTML/JS estático (no debería):",
    );
    for (const file of nameLeaks) {
      console.error(`  - ${file}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    "✅ secrets:check — BREVO_API_KEY no aparece en los artefactos generados",
  );
}

main();
