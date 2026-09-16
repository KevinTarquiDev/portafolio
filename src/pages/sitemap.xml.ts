import type { APIRoute } from "astro";
import { locales } from "../i18n/config";
import { canonicalUrl } from "../lib/seo";
import { DEFAULT_SITE_URL } from "../lib/site";

/**
 * Sitemap estático: solo /es/ y /en/ (las páginas de resultado del
 * formulario y la 404 llevan noindex y no se listan aquí).
 */
export const GET: APIRoute = ({ site }) => {
  const siteUrl = site?.toString() ?? DEFAULT_SITE_URL;

  const urls = locales.map((locale) => {
    const loc = canonicalUrl(siteUrl, locale);
    const alternateLinksXml = locales
      .map(
        (altLocale) =>
          `    <xhtml:link rel="alternate" hreflang="${altLocale}" href="${canonicalUrl(siteUrl, altLocale)}" />`,
      )
      .join("\n");

    return `  <url>\n    <loc>${loc}</loc>\n${alternateLinksXml}\n  </url>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join("\n")}\n</urlset>\n`;

  return new Response(xml, {
    headers: { "content-type": "application/xml; charset=utf-8" },
  });
};
