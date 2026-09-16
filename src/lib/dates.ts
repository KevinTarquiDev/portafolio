import type { Locale } from "./resume";

/**
 * Una fecha de JSON Resume: "YYYY" o "YYYY-MM".
 */
export interface ResumeDate {
  year: number;
  month?: number;
}

const RESUME_DATE_PATTERN = /^(\d{4})(?:-(\d{2}))?$/;

/**
 * Parsea una fecha en formato JSON Resume ("YYYY" o "YYYY-MM").
 * Lanza si el formato no es válido: una fecha de resume mal formada
 * es un error de datos, no un caso a degradar en silencio.
 */
export function parseResumeDate(value: string): ResumeDate {
  const match = RESUME_DATE_PATTERN.exec(value);
  if (!match) {
    throw new Error(`Fecha de resume inválida: "${value}"`);
  }

  const year = Number(match[1]);
  const month = match[2] === undefined ? undefined : Number(match[2]);

  return month === undefined ? { year } : { year, month };
}

/**
 * Formatea un rango de años: "2025" si coinciden, "2023 — 2026" si difieren,
 * o "2023 — {presentLabel}" si no hay fecha de fin.
 */
export function formatYearRange(
  start: string,
  end: string | undefined,
  presentLabel: string,
): string {
  const startYear = parseResumeDate(start).year;

  if (!end) {
    return `${startYear} — ${presentLabel}`;
  }

  const endYear = parseResumeDate(end).year;
  return startYear === endYear ? `${startYear}` : `${startYear} — ${endYear}`;
}

const BCP47_BY_LOCALE: Record<Locale, string> = {
  es: "es-EC",
  en: "en-US",
};

/**
 * Código BCP47 completo para un Locale ("es" -> "es-EC"), usado por
 * Intl.DateTimeFormat e Intl.DisplayNames en toda la capa de datos.
 */
export function localeToBcp47(locale: Locale): string {
  return BCP47_BY_LOCALE[locale];
}

/**
 * Formatea un rango de meses ("jun 2023 — dic 2025") usando
 * Intl.DateTimeFormat según el locale. Si no hay fecha de fin,
 * usa presentLabel.
 */
export function formatMonthRange(
  start: string,
  end: string | undefined,
  locale: Locale,
  presentLabel: string,
): string {
  const formatter = new Intl.DateTimeFormat(BCP47_BY_LOCALE[locale], {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

  const startLabel = formatMonth(formatter, start);
  const endLabel = end ? formatMonth(formatter, end) : presentLabel;

  return `${startLabel} — ${endLabel}`;
}

function formatMonth(formatter: Intl.DateTimeFormat, value: string): string {
  const parsed = parseResumeDate(value);
  const month = parsed.month ?? 1;
  return formatter.format(new Date(Date.UTC(parsed.year, month - 1, 1)));
}
