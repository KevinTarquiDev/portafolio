import type { Locale } from "../lib/resume";

/**
 * Textos de interfaz (navegación, escenas, formulario, CV, 404, a11y).
 * No contiene ningún dato profesional: eso viene siempre de getResume(locale).
 */
export interface UiStrings {
  nav: {
    work: string;
    experience: string;
    stack: string;
    contact: string;
  };
  hero: {
    eyebrow: string;
    ctaWork: string;
    ctaCv: string;
    cvBadge: string;
  };
  about: {
    eyebrow: string;
    connector: string;
  };
  experience: {
    eyebrow: string;
    current: string;
  };
  work: {
    eyebrow: string;
    selected: string;
  };
  featured: {
    eyebrow: string;
    stackLabel: string;
    ctaVisit: string;
    captionAdmin: string;
    captionLanding: string;
    captionMobile: string;
  };
  stack: {
    eyebrow: string;
  };
  practices: {
    eyebrow: string;
    titleTop: string;
    titleBottom: string;
  };
  education: {
    eyebrow: string;
  };
  contact: {
    eyebrow: string;
    title: string;
    titleMobile: string[];
    labelEmail: string;
    labelPhone: string;
    labelLocation: string;
    whatsappGreeting: string;
    formName: string;
    formEmail: string;
    formMessage: string;
    formSubmit: string;
    formSubmitting: string;
    formSuccess: string;
    formErrorGeneric: string;
    formErrorNameRequired: string;
    formErrorNameLength: string;
    formErrorEmailRequired: string;
    formErrorEmailInvalid: string;
    formErrorMessageRequired: string;
    formErrorMessageLength: string;
    formErrorRateLimited: string;
    footerBackToTop: string;
    resultSentTitle: string;
    resultErrorTitle: string;
    resultCta: string;
  };
  cv: {
    sectionProfile: string;
    sectionExperience: string;
    sectionProjects: string;
    sectionEducation: string;
    sectionSkills: string;
    sectionLanguages: string;
  };
  notFound: {
    title: string;
    message: string;
    cta: string;
  };
  meta: {
    titleSeparator: string;
  };
  a11y: {
    mainNavigation: string;
    languageSelector: string;
    skipToContent: string;
    openMenu: string;
    closeMenu: string;
    opensInNewTab: string;
  };
}

const es: UiStrings = {
  nav: {
    work: "Trabajo",
    experience: "Experiencia",
    stack: "Stack",
    contact: "Contacto",
  },
  hero: {
    eyebrow: "Inicio",
    ctaWork: "Ver proyectos",
    ctaCv: "Descargar CV",
    cvBadge: "PDF",
  },
  about: {
    eyebrow: "Sobre mí",
    connector: "con orientación",
  },
  experience: {
    eyebrow: "Experiencia",
    current: "Actualidad",
  },
  work: {
    eyebrow: "Trabajo seleccionado",
    selected: "Selected",
  },
  featured: {
    eyebrow: "Proyecto destacado",
    stackLabel: "Stack",
    ctaVisit: "Visitar sitio",
    captionAdmin: "Panel administrativo",
    captionLanding: "Landing pública",
    captionMobile: "Catálogo mobile",
  },
  stack: {
    eyebrow: "Stack",
  },
  practices: {
    eyebrow: "Cómo trabajo",
    titleTop: "Cómo",
    titleBottom: "trabajo",
  },
  education: {
    eyebrow: "Educación",
  },
  contact: {
    eyebrow: "Contacto",
    title: "HABLEMOS",
    titleMobile: ["HA", "BLE", "MOS"],
    labelEmail: "Email",
    labelPhone: "Teléfono",
    labelLocation: "Ubicación",
    whatsappGreeting: "Hola, vi tu portafolio y me gustaría conversar contigo.",
    formName: "Nombre",
    formEmail: "Email",
    formMessage: "Mensaje",
    formSubmit: "Enviar mensaje",
    formSubmitting: "Enviando…",
    formSuccess: "Mensaje enviado. Te responderé pronto.",
    formErrorGeneric: "No se pudo enviar el mensaje. Intenta de nuevo.",
    formErrorNameRequired: "Escribe tu nombre.",
    formErrorNameLength: "El nombre debe tener entre 2 y 100 caracteres.",
    formErrorEmailRequired: "Escribe tu email.",
    formErrorEmailInvalid: "Escribe un email válido.",
    formErrorMessageRequired: "Escribe un mensaje.",
    formErrorMessageLength: "El mensaje debe tener entre 10 y 2000 caracteres.",
    formErrorRateLimited: "Espera unos segundos antes de volver a intentar.",
    footerBackToTop: "Volver arriba",
    resultSentTitle: "Mensaje enviado",
    resultErrorTitle: "No se pudo enviar",
    resultCta: "Volver al inicio",
  },
  cv: {
    sectionProfile: "Perfil",
    sectionExperience: "Experiencia",
    sectionProjects: "Proyectos",
    sectionEducation: "Educación",
    sectionSkills: "Habilidades",
    sectionLanguages: "Idiomas",
  },
  notFound: {
    title: "Página no encontrada",
    message: "La página que buscas no existe o fue movida.",
    cta: "Volver al inicio",
  },
  meta: {
    titleSeparator: "—",
  },
  a11y: {
    mainNavigation: "Navegación principal",
    languageSelector: "Selector de idioma",
    skipToContent: "Saltar al contenido",
    openMenu: "Abrir menú",
    closeMenu: "Cerrar menú",
    opensInNewTab: "abre en una nueva pestaña",
  },
};

const en: UiStrings = {
  nav: {
    work: "Work",
    experience: "Experience",
    stack: "Stack",
    contact: "Contact",
  },
  hero: {
    eyebrow: "Home",
    ctaWork: "View projects",
    ctaCv: "Download CV",
    cvBadge: "PDF",
  },
  about: {
    eyebrow: "About",
    connector: "focused on",
  },
  experience: {
    eyebrow: "Experience",
    current: "Present",
  },
  work: {
    eyebrow: "Selected work",
    selected: "Selected",
  },
  featured: {
    eyebrow: "Featured project",
    stackLabel: "Stack",
    ctaVisit: "Visit site",
    captionAdmin: "Admin panel",
    captionLanding: "Public landing",
    captionMobile: "Mobile catalog",
  },
  stack: {
    eyebrow: "Stack",
  },
  practices: {
    eyebrow: "How I work",
    titleTop: "How I",
    titleBottom: "work",
  },
  education: {
    eyebrow: "Education",
  },
  contact: {
    eyebrow: "Contact",
    title: "LET'S TALK",
    titleMobile: ["LET'S", "TALK"],
    labelEmail: "Email",
    labelPhone: "Phone",
    labelLocation: "Location",
    whatsappGreeting:
      "Hi, I saw your portfolio and would like to get in touch.",
    formName: "Name",
    formEmail: "Email",
    formMessage: "Message",
    formSubmit: "Send message",
    formSubmitting: "Sending…",
    formSuccess: "Message sent. I'll get back to you soon.",
    formErrorGeneric: "Couldn't send the message. Please try again.",
    formErrorNameRequired: "Enter your name.",
    formErrorNameLength: "Name must be between 2 and 100 characters.",
    formErrorEmailRequired: "Enter your email.",
    formErrorEmailInvalid: "Enter a valid email.",
    formErrorMessageRequired: "Enter a message.",
    formErrorMessageLength: "Message must be between 10 and 2000 characters.",
    formErrorRateLimited: "Please wait a few seconds and try again.",
    footerBackToTop: "Back to top",
    resultSentTitle: "Message sent",
    resultErrorTitle: "Couldn't send it",
    resultCta: "Back to home",
  },
  cv: {
    sectionProfile: "Profile",
    sectionExperience: "Experience",
    sectionProjects: "Projects",
    sectionEducation: "Education",
    sectionSkills: "Skills",
    sectionLanguages: "Languages",
  },
  notFound: {
    title: "Page not found",
    message: "The page you're looking for doesn't exist or was moved.",
    cta: "Back to home",
  },
  meta: {
    titleSeparator: "—",
  },
  a11y: {
    mainNavigation: "Main navigation",
    languageSelector: "Language selector",
    skipToContent: "Skip to content",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    opensInNewTab: "opens in a new tab",
  },
};

export const ui: Record<Locale, UiStrings> = { es, en };
