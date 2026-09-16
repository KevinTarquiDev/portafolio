import { describe, expect, test } from "bun:test";
import { alternateLinks, canonicalUrl, ogLocale, personJsonLd } from "./seo";

const SITE_URL = "https://kevintarqui.vercel.app";

describe("canonicalUrl", () => {
  test("construye la URL absoluta del locale", () => {
    expect(canonicalUrl(SITE_URL, "es")).toBe(
      "https://kevintarqui.vercel.app/es/",
    );
    expect(canonicalUrl(SITE_URL, "en")).toBe(
      "https://kevintarqui.vercel.app/en/",
    );
  });

  test("funciona igual si siteUrl no trae barra final", () => {
    expect(canonicalUrl("https://kevintarqui.vercel.app", "es")).toBe(
      "https://kevintarqui.vercel.app/es/",
    );
  });
});

describe("alternateLinks", () => {
  test("incluye es, en y x-default apuntando al locale por defecto", () => {
    const links = alternateLinks(SITE_URL);
    expect(links).toEqual([
      { hreflang: "es", href: "https://kevintarqui.vercel.app/es/" },
      { hreflang: "en", href: "https://kevintarqui.vercel.app/en/" },
      { hreflang: "x-default", href: "https://kevintarqui.vercel.app/es/" },
    ]);
  });
});

describe("ogLocale", () => {
  test("mapea los locales a códigos de Open Graph", () => {
    expect(ogLocale("es")).toBe("es_EC");
    expect(ogLocale("en")).toBe("en_US");
  });
});

describe("personJsonLd", () => {
  test("incluye los datos esperados y ninguna forma de contacto directo", () => {
    const jsonLd = personJsonLd(SITE_URL, "es");
    expect(jsonLd["@type"]).toBe("Person");
    expect(jsonLd.name).toBe("Kevin Andrés Tarqui Tapia");
    expect(jsonLd.alternateName).toBe("Kevin Tarqui");
    expect(jsonLd.url).toBe("https://kevintarqui.vercel.app/es/");
    expect(jsonLd.sameAs).toEqual([
      "https://linkedin.com/in/kevintarquidev",
      "https://github.com/KevinTarquiDev",
    ]);
    const serialized = JSON.stringify(jsonLd);
    expect(serialized).not.toContain("@gmail.com");
    expect(serialized).not.toContain("+593");
  });

  test("es serializable a JSON válido", () => {
    expect(() => JSON.stringify(personJsonLd(SITE_URL, "en"))).not.toThrow();
  });
});
