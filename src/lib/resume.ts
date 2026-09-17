import source from "../../data/resume.json";
import type { Resume } from "../types/resume";

export type Locale = "es" | "en";

/** Un par de traducción es un objeto con exactamente las claves `es` y `en`. */
export function isTranslation(
  value: object,
): value is { es: unknown; en: unknown } {
  return "es" in value && "en" in value && Object.keys(value).length === 2;
}

export function resolveLocale(value: unknown, locale: Locale): unknown {
  if (Array.isArray(value)) {
    return value.map((item: unknown) => resolveLocale(item, locale));
  }
  if (typeof value !== "object" || value === null) {
    return value;
  }
  if (isTranslation(value)) {
    return resolveLocale(value[locale], locale);
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      resolveLocale(item, locale),
    ]),
  );
}

function resolveResume(locale: Locale): Resume {
  // resolveLocale sustituye cada par { es, en }: justo lo que modela Resolved<T>.
  return resolveLocale(source, locale) as Resume;
}

const resumes: Record<Locale, Resume> = {
  es: resolveResume("es"),
  en: resolveResume("en"),
};

export function getResume(locale: Locale): Resume {
  return resumes[locale];
}
