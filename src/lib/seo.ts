import { locales, defaultLocale } from "../i18n/config";
import { getResume, type Locale } from "./resume";

/**
 * canonical, hreflang y JSON-LD del sitio. `siteUrl` es Astro.site
 * (o su fallback), pasado explícitamente para que estas funciones
 * sean puras y testeables sin depender de Astro.
 */

function withTrailingSlash(url: string): string {
  return url.endsWith("/") ? url : `${url}/`;
}

/** URL canónica absoluta de la página de inicio de un locale. */
export function canonicalUrl(siteUrl: string, locale: Locale): string {
  return new URL(`/${locale}/`, withTrailingSlash(siteUrl)).toString();
}

export interface AlternateLink {
  hreflang: string;
  href: string;
}

/**
 * Enlaces hreflang recíprocos para las páginas de inicio: uno por
 * locale más x-default apuntando al locale por defecto.
 */
export function alternateLinks(siteUrl: string): AlternateLink[] {
  return [
    ...locales.map((locale) => ({
      hreflang: locale,
      href: canonicalUrl(siteUrl, locale),
    })),
    { hreflang: "x-default", href: canonicalUrl(siteUrl, defaultLocale) },
  ];
}

const OG_LOCALE_BY_LANG: Record<Locale, string> = {
  es: "es_EC",
  en: "en_US",
};

/** Locale de Open Graph ("es_EC") para un locale del sitio. */
export function ogLocale(locale: Locale): string {
  return OG_LOCALE_BY_LANG[locale];
}

/**
 * JSON-LD schema.org/Person. Deliberadamente sin email ni teléfono
 * (para no alimentar scrapers de spam): esos datos ya son visibles en
 * la página de contacto para personas.
 */
export function personJsonLd(
  siteUrl: string,
  locale: Locale,
): Record<string, unknown> {
  const resume = getResume(locale);
  const { basics } = resume;

  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: basics.name,
    alternateName: basics["x-displayName"],
    jobTitle: basics.label,
    description: basics["x-tagline"],
    url: canonicalUrl(siteUrl, locale),
    address: {
      "@type": "PostalAddress",
      addressLocality: basics.location.city,
      addressCountry: basics.location.countryCode,
    },
    sameAs: basics.profiles.map((profile) => profile.url),
  };
}
