import { localeToBcp47 } from "./dates";
import { getResume, type Locale } from "./resume";

/**
 * Capa de transformación: convierte el resume (fuente única de verdad)
 * en un view model tipado por escena. Los componentes consumen esto,
 * nunca leen data/resume.*.json directamente.
 */

export interface CompanyName {
  short: string;
  parent?: string;
  acronym?: string;
}

const PARENT_PATTERN = /^(.+?)\s-\s(.+)$/;
const ACRONYM_PATTERN = /^(.+?)\s\(([^)]+)\)$/;

/**
 * Separa un nombre de empresa en su forma corta y, si aplica, su
 * institución matriz ("RIOUC - Universidad Católica de Cuenca") o su
 * acrónimo ("Sudamericana de Software (SASF)").
 */
export function splitCompanyName(name: string): CompanyName {
  const parentMatch = PARENT_PATTERN.exec(name);
  if (parentMatch) {
    return { short: parentMatch[1], parent: parentMatch[2] };
  }

  const acronymMatch = ACRONYM_PATTERN.exec(name);
  if (acronymMatch) {
    return { short: acronymMatch[1], acronym: acronymMatch[2] };
  }

  return { short: name };
}

/**
 * Normaliza un teléfono a un href "tel:" válido.
 */
export function phoneHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  return `tel:${digits}`;
}

/**
 * Quita el protocolo y la barra final de una URL para mostrarla
 * como texto ("https://webstockify.com/" -> "webstockify.com").
 */
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

/**
 * Nombre del país en el idioma del locale, a partir de un countryCode ISO.
 */
export function countryName(countryCode: string, locale: Locale): string {
  const displayNames = new Intl.DisplayNames([localeToBcp47(locale)], {
    type: "region",
  });
  return displayNames.of(countryCode) ?? countryCode;
}

/**
 * Índice de dos dígitos ("01", "02", ...) usado en los rótulos mono
 * de cada escena y de cada ítem dentro de una lista.
 */
export function formatIndex(position: number): string {
  return String(position).padStart(2, "0");
}

export interface LocationViewModel {
  city: string;
  countryCode: string;
  countryName: string;
}

export interface HeroViewModel {
  displayName: string;
  headline: string;
  tagline: string;
  location: LocationViewModel;
}

export interface AboutViewModel {
  role: string;
  focus: string;
  summaryShort: string;
  focusAreas: string[];
}

export interface WorkItemViewModel {
  index: string;
  company: CompanyName;
  companyFull: string;
  position: string;
  description?: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  summary: string;
  highlights: string[];
}

export interface ExperienceViewModel {
  items: WorkItemViewModel[];
}

export interface ProjectViewModel {
  index: string;
  name: string;
  description: string;
  type: string;
  url: string;
  urlDisplay: string;
  startDate?: string;
  endDate?: string;
  isCurrent: boolean;
  keywords: string[];
  highlights: string[];
  roles: string[];
}

export interface WorkIntroItemViewModel {
  index: string;
  name: string;
}

export interface WorkIntroViewModel {
  items: WorkIntroItemViewModel[];
  featured: ProjectViewModel;
}

export interface SkillGroupViewModel {
  index: string;
  name: string;
  keywords: string[];
}

export interface StackViewModel {
  groups: SkillGroupViewModel[];
}

export interface PracticeViewModel {
  index: string;
  name: string;
  keywords: string[];
}

export interface PracticesViewModel {
  items: PracticeViewModel[];
}

export interface EducationItemViewModel {
  institution: string;
  area: string;
  studyType: string;
  startDate: string;
  endDate?: string;
  status?: string;
}

export interface EducationViewModel {
  items: EducationItemViewModel[];
}

export interface ContactProfileViewModel {
  network: string;
  username: string;
  url: string;
  urlDisplay: string;
}

export interface ContactViewModel {
  email: string;
  phone: string;
  phoneHref: string;
  location: LocationViewModel;
  profiles: ContactProfileViewModel[];
}

export interface PortfolioViewModel {
  locale: Locale;
  hero: HeroViewModel;
  about: AboutViewModel;
  experience: ExperienceViewModel;
  workIntro: WorkIntroViewModel;
  featuredProject: ProjectViewModel;
  stack: StackViewModel;
  practices: PracticesViewModel;
  education: EducationViewModel;
  contact: ContactViewModel;
}

/**
 * Ensambla el view model tipado de todas las escenas del portfolio
 * a partir de getResume(locale). Única puerta de entrada a los datos
 * profesionales para los componentes.
 */
export function getPortfolio(locale: Locale): PortfolioViewModel {
  const resume = getResume(locale);
  const { basics } = resume;

  const location: LocationViewModel = {
    city: basics.location.city,
    countryCode: basics.location.countryCode,
    countryName: countryName(basics.location.countryCode, locale),
  };

  const hero: HeroViewModel = {
    displayName: basics["x-displayName"],
    headline: basics["x-headline"],
    tagline: basics["x-tagline"],
    location,
  };

  const about: AboutViewModel = {
    role: basics["x-specialization"].role,
    focus: basics["x-specialization"].focus,
    summaryShort: basics["x-summaryShort"],
    focusAreas: basics["x-focusAreas"],
  };

  const experience: ExperienceViewModel = {
    items: resume.work.map((job, position) => ({
      index: formatIndex(position + 1),
      company: splitCompanyName(job.name),
      companyFull: job.name,
      position: job.position,
      description: job.description,
      startDate: job.startDate,
      endDate: job.endDate,
      isCurrent: !job.endDate,
      summary: job.summary,
      highlights: [...job.highlights],
    })),
  };

  const projects = resume.projects.map(
    (project, position): ProjectViewModel => ({
      index: formatIndex(position + 1),
      name: project.name,
      description: project.description,
      type: project.type,
      url: project.url,
      urlDisplay: displayUrl(project.url),
      startDate: project.startDate,
      endDate: project.endDate,
      isCurrent: !project.endDate,
      keywords: [...project.keywords],
      highlights: [...project.highlights],
      roles: [...project.roles],
    }),
  );

  const [featured, ...restProjects] = projects;
  if (!featured) {
    throw new Error(
      "El resume no tiene proyectos: se requiere al menos uno para la escena destacada",
    );
  }

  const workIntro: WorkIntroViewModel = {
    items: [featured, ...restProjects].map((project) => ({
      index: project.index,
      name: project.name,
    })),
    featured,
  };

  const stack: StackViewModel = {
    groups: resume.skills.map((group, position) => ({
      index: formatIndex(position + 1),
      name: group.name,
      keywords: [...group.keywords],
    })),
  };

  const practices: PracticesViewModel = {
    items: resume["x-practices"].map((practice, position) => ({
      index: formatIndex(position + 1),
      name: practice.name,
      keywords: [...practice.keywords],
    })),
  };

  const education: EducationViewModel = {
    items: resume.education.map((entry) => ({
      institution: entry.institution,
      area: entry.area,
      studyType: entry.studyType,
      startDate: entry.startDate,
      endDate: entry.endDate,
      status: entry.status,
    })),
  };

  const contact: ContactViewModel = {
    email: basics.email,
    phone: basics.phone,
    phoneHref: phoneHref(basics.phone),
    location,
    profiles: basics.profiles.map((profile) => ({
      network: profile.network,
      username: profile.username,
      url: profile.url,
      urlDisplay: displayUrl(profile.url),
    })),
  };

  return {
    locale,
    hero,
    about,
    experience,
    workIntro,
    featuredProject: featured,
    stack,
    practices,
    education,
    contact,
  };
}
