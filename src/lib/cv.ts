import { formatMonthRange, localeToBcp47 } from "./dates";
import { countryName } from "./portfolio";
import { getResume, type Locale } from "./resume";
import { DEFAULT_SITE_URL } from "./site";
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

export interface CvLink {
  label: string;
  url: string;
}

export interface CvContact {
  location: string;
  phone: string;
  email: string;
  links: CvLink[];
  availability: string;
}

export interface CvExperienceItem {
  company: string;
  position: string;
  /** "Remoto · Guayaquil, Guayas, Ecuador", con la descripción al frente si existe. */
  detail: string;
  dateRange: string;
  highlights: string[];
}

export interface CvProjectItem {
  name: string;
  description: string;
  dateRange: string;
  /** Highlights del resume más la línea de stack derivada de keywords. */
  highlights: string[];
}

export interface CvEducationItem {
  institution: string;
  /** "Ingeniería de Software · Título en trámite". */
  detail: string;
  dateRange: string;
}

export interface CvSkillGroup {
  name: string;
  keywords: string[];
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
  };
  experience: CvExperienceItem[];
  projects: CvProjectItem[];
  education: CvEducationItem[];
  skills: CvSkillGroup[];
  languagesLabel: string;
  /** "Español nativo · Inglés intermedio (B1)". */
  languagesLine: string;
}

const SEPARATOR = " · ";

/** Quita el protocolo y la barra final para mostrar una URL legible. */
function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

/** "Nativo" -> "nativo", conservando siglas como "(B1)". */
function lowercaseFirst(value: string): string {
  return value.charAt(0).toLowerCase() + value.slice(1);
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
  const present = ui[locale].experience.current;
  const stackList = new Intl.ListFormat(localeToBcp47(locale), {
    type: "conjunction",
  });

  return {
    locale,
    name: basics.name,
    label: basics.label,
    summary: basics.summary,
    contact: {
      location: `${basics.location.city}, ${countryName(basics.location.countryCode, locale)}`,
      phone: basics.phone,
      email: basics.email,
      links: [
        ...basics.profiles.map((profile) => ({
          label: displayUrl(profile.url),
          url: profile.url,
        })),
        { label: displayUrl(DEFAULT_SITE_URL), url: DEFAULT_SITE_URL },
      ],
      availability: basics["x-availability"].join(SEPARATOR),
    },
    sections: {
      profile: strings.sectionProfile,
      experience: strings.sectionExperience,
      projects: strings.sectionProjects,
      education: strings.sectionEducation,
      skills: strings.sectionSkills,
    },
    experience: resume.work.map((job) => ({
      company: job.name,
      position: job.position,
      detail: [job.description, job.location].filter(Boolean).join(SEPARATOR),
      dateRange: formatMonthRange(job.startDate, job.endDate, locale, present),
      highlights: [...job.highlights],
    })),
    projects: resume.projects.map((project) => ({
      name: project.name,
      description: project.description.replace(/\.$/, ""),
      dateRange: formatMonthRange(
        project.startDate,
        project.endDate,
        locale,
        present,
      ),
      highlights: [
        ...project.highlights,
        `${strings.mainStack}: ${stackList.format(project.keywords)}.`,
      ],
    })),
    education: resume.education.map((entry) => ({
      institution: entry.institution,
      detail: [entry.area, entry.status].filter(Boolean).join(SEPARATOR),
      dateRange: formatMonthRange(
        entry.startDate,
        entry.endDate,
        locale,
        present,
      ),
    })),
    skills: resume.skills.map((group) => ({
      name: group.name,
      keywords: [...group.keywords],
    })),
    languagesLabel: strings.sectionLanguages,
    languagesLine: resume.languages
      .map((entry) => `${entry.language} ${lowercaseFirst(entry.fluency)}`)
      .join(SEPARATOR),
  };
}
