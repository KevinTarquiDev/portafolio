import resumeEn from "../../data/resume.en.json";
import resumeEs from "../../data/resume.es.json";
import type { Resume } from "../types/resume";

export type Locale = "es" | "en";

const resumes: Record<Locale, Resume> = {
  es: resumeEs,
  en: resumeEn,
};

export function getResume(locale: Locale): Resume {
  return resumes[locale];
}
