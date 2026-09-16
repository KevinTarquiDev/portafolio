import { formatMonthRange, formatYearRange } from "./dates";
import { countryName } from "./portfolio";
import { getResume, type Locale } from "./resume";
import { ui } from "../i18n/ui";

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

/**
 * Nombre de archivo sugerido al descargar el CV, distinto de la ruta
 * pública: usa el nombre completo con guiones bajos y sin acentos
 * ("Kevin_Andres_Tarqui_Tapia_CV.pdf"), con sufijo de idioma solo
 * cuando no es el idioma principal (español).
 */
export function getCvDownloadName(locale: Locale): string {
  const fullName = getResume(locale).basics.name;
  const base = fullName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "_");
  const suffix = locale === "es" ? "" : `_${locale.toUpperCase()}`;
  return `${base}_CV${suffix}.pdf`;
}

/**
 * Modelo de datos del CV: funciones puras y testeables que preparan
 * el contenido de cada sección desde el resume. El dibujo con pdfkit
 * (scripts/generate-cv.ts) solo recorre esta estructura.
 */

export interface CvContact {
  location: string;
  phone: string;
  email: string;
  profiles: Array<{ network: string; url: string }>;
}

export interface CvExperienceItem {
  company: string;
  location: string;
  position: string;
  description?: string;
  dateRange: string;
  summary: string;
  highlights: string[];
}

export interface CvProjectItem {
  name: string;
  type: string;
  url: string;
  dateRange: string;
  keywords: string[];
  highlights: string[];
}

export interface CvEducationItem {
  institution: string;
  area: string;
  studyType: string;
  dateRange: string;
  status?: string;
}

export interface CvSkillGroup {
  name: string;
  keywords: string[];
}

export interface CvLanguage {
  language: string;
  fluency: string;
}

export interface CvDocument {
  locale: Locale;
  name: string;
  label: string;
  summary: string;
  contact: CvContact;
  sections: {
    profile: string;
    experience: string;
    projects: string;
    education: string;
    skills: string;
    languages: string;
  };
  experience: CvExperienceItem[];
  projects: CvProjectItem[];
  education: CvEducationItem[];
  skills: CvSkillGroup[];
  languages: CvLanguage[];
}

/**
 * Construye el contenido del CV para un locale, directamente desde
 * getResume(locale). Nunca incluye extensiones `x-*`: son propias del
 * portfolio, no del CV.
 */
export function buildCvDocument(locale: Locale): CvDocument {
  const resume = getResume(locale);
  const { basics } = resume;
  const strings = ui[locale].cv;

  return {
    locale,
    name: basics.name,
    label: basics.label,
    summary: basics.summary,
    contact: {
      location: `${basics.location.city}, ${countryName(basics.location.countryCode, locale)}`,
      phone: basics.phone,
      email: basics.email,
      profiles: basics.profiles.map((profile) => ({
        network: profile.network,
        url: profile.url,
      })),
    },
    sections: {
      profile: strings.sectionProfile,
      experience: strings.sectionExperience,
      projects: strings.sectionProjects,
      education: strings.sectionEducation,
      skills: strings.sectionSkills,
      languages: strings.sectionLanguages,
    },
    experience: resume.work.map((job) => ({
      company: job.name,
      location: job.location,
      position: job.position,
      description: job.description,
      dateRange: formatMonthRange(
        job.startDate,
        job.endDate,
        locale,
        ui[locale].experience.current,
      ),
      summary: job.summary,
      highlights: [...job.highlights],
    })),
    projects: resume.projects.map((project) => ({
      name: project.name,
      type: project.type,
      url: project.url,
      dateRange: project.startDate
        ? formatYearRange(
            project.startDate,
            project.endDate,
            ui[locale].experience.current,
          )
        : "",
      keywords: [...project.keywords],
      highlights: [...project.highlights],
    })),
    education: resume.education.map((entry) => ({
      institution: entry.institution,
      area: entry.area,
      studyType: entry.studyType,
      dateRange: formatYearRange(
        entry.startDate,
        entry.endDate,
        ui[locale].experience.current,
      ),
      status: entry.status,
    })),
    skills: resume.skills.map((group) => ({
      name: group.name,
      keywords: [...group.keywords],
    })),
    languages: resume.languages.map((entry) => ({
      language: entry.language,
      fluency: entry.fluency,
    })),
  };
}
