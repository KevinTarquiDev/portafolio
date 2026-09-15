import { getResume, type Locale } from "./resume";

/**
 * Convierte un nombre en un slug de archivo ("Kevin Tarqui" -> "kevin-tarqui").
 */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Ruta pública del CV en PDF para un locale, derivada de x-displayName.
 * El PDF en sí se genera con `bun run cv:generate` (Fase 6,
 * scripts/generate-cv.ts) a partir de esta misma función.
 */
export function getCvHref(locale: Locale): string {
  const displayName = getResume(locale).basics["x-displayName"];
  return `/cv/${slugify(displayName)}-cv-${locale}.pdf`;
}
