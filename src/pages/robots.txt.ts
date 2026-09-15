import type { APIRoute } from "astro";
import { DEFAULT_SITE_URL } from "../lib/site";

export const GET: APIRoute = ({ site }) => {
  const siteUrl = site?.toString() ?? DEFAULT_SITE_URL;
  const sitemapUrl = new URL("/sitemap.xml", siteUrl).toString();

  const body = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /api/",
    "",
    `Sitemap: ${sitemapUrl}`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
};
