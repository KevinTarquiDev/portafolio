import { describe, expect, test } from "bun:test";
import { getResume, type Locale } from "./resume";
import {
  countryName,
  displayUrl,
  formatIndex,
  getPortfolio,
  phoneHref,
  splitCompanyName,
  whatsappHref,
} from "./portfolio";

describe("splitCompanyName", () => {
  test("separa nombre y matriz cuando hay un guion", () => {
    expect(splitCompanyName("RIOUC - Universidad Católica de Cuenca")).toEqual({
      short: "RIOUC",
      parent: "Universidad Católica de Cuenca",
    });
  });

  test("separa nombre y acrónimo entre paréntesis", () => {
    expect(splitCompanyName("Sudamericana de Software (SASF)")).toEqual({
      short: "Sudamericana de Software",
      acronym: "SASF",
    });
  });

  test("devuelve el nombre tal cual si no hay separador", () => {
    expect(splitCompanyName("Kruger Corp")).toEqual({ short: "Kruger Corp" });
  });
});

describe("phoneHref", () => {
  test("normaliza un teléfono con espacios a tel:", () => {
    expect(phoneHref("+593 96 400 4859")).toBe("tel:+593964004859");
  });
});

describe("whatsappHref", () => {
  test("usa el teléfono del resume y codifica el saludo inicial", () => {
    expect(whatsappHref("+593 96 400 4859", "Hola, ¿cómo estás?")).toBe(
      "https://wa.me/593964004859?text=Hola%2C%20%C2%BFc%C3%B3mo%20est%C3%A1s%3F",
    );
  });
});

describe("displayUrl", () => {
  test("quita protocolo y barra final", () => {
    expect(displayUrl("https://webstockify.com")).toBe("webstockify.com");
    expect(displayUrl("https://webstockify.com/")).toBe("webstockify.com");
    expect(displayUrl("https://github.com/KevinTarquiDev")).toBe(
      "github.com/KevinTarquiDev",
    );
  });
});

describe("countryName", () => {
  test("resuelve el nombre de país por locale", () => {
    expect(countryName("EC", "es")).toBe("Ecuador");
    expect(countryName("EC", "en")).toBe("Ecuador");
  });
});

describe("formatIndex", () => {
  test("rellena con cero a la izquierda", () => {
    expect(formatIndex(1)).toBe("01");
    expect(formatIndex(12)).toBe("12");
  });
});

const locales: Locale[] = ["es", "en"];

describe("getPortfolio", () => {
  test.each(locales)("no devuelve strings vacíos (%s)", (locale) => {
    const portfolio = getPortfolio(locale);
    const emptyPaths = findEmptyStrings(portfolio, "portfolio");
    expect(emptyPaths).toEqual([]);
  });

  test("la escena destacada es el primer proyecto del resume", () => {
    const portfolio = getPortfolio("es");
    const [firstProject] = getResume("es").projects;
    if (!firstProject) {
      throw new Error("el resume debe tener al menos un proyecto");
    }
    expect(portfolio.featuredProject.name).toBe(firstProject.name);
    expect(portfolio.workIntro.featured.name).toBe(firstProject.name);
  });

  test("isCurrent es true solo cuando falta endDate", () => {
    const portfolio = getPortfolio("es");
    for (const item of portfolio.experience.items) {
      expect(item.isCurrent).toBe(!item.endDate);
    }
  });
});

/**
 * Recorre un valor recursivamente y devuelve las rutas de todos los
 * strings vacíos o arrays vacíos que encuentre.
 */
function findEmptyStrings(value: unknown, path: string): string[] {
  if (typeof value === "string") {
    return value.trim() === "" ? [path] : [];
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return [`${path} (array vacío)`];
    }
    return value.flatMap((item, index) =>
      findEmptyStrings(item, `${path}[${index}]`),
    );
  }

  if (value !== null && typeof value === "object") {
    return Object.entries(value).flatMap(([key, entryValue]) =>
      findEmptyStrings(entryValue, `${path}.${key}`),
    );
  }

  return [];
}
