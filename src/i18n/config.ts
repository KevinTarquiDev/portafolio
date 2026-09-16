import type { Locale } from "../lib/resume";

export const locales: readonly Locale[] = ["es", "en"];

export const defaultLocale: Locale = "es";

/**
 * Narrowing de un valor desconocido (por ejemplo, un parámetro de ruta)
 * a un Locale soportado.
 */
export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" && (locales as readonly string[]).includes(value)
  );
}

/**
 * Construye la ruta absoluta de una página del portfolio para un locale,
 * opcionalmente con un hash de escena (por ejemplo "#contact").
 */
export function localePath(locale: Locale, hash?: string): string {
  const base = `/${locale}/`;
  return hash ? `${base}${hash}` : base;
}

/**
 * Dado un locale, devuelve el otro locale soportado (para el selector ES/EN).
 */
export function alternateLocale(locale: Locale): Locale {
  const other = locales.find((candidate) => candidate !== locale);
  if (!other) {
    throw new Error(`No hay locale alternativo para "${locale}"`);
  }
  return other;
}
