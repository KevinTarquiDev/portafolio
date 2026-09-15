import { describe, expect, test } from "bun:test";
import { getResume, type Locale } from "./resume";
import {
  countryName,
  displayUrl,
  formatIndex,
  getPortfolio,
  phoneHref,
  splitCompanyName,
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
    const resume = getResume("es");
    const portfolio = getPortfolio("es");
    expect(portfolio.featuredProject.name).toBe(resume.projects[0]?.name);
    expect(portfolio.workIntro.featured.name).toBe(resume.projects[0]?.name);
  });

  test("isCurrent es true solo cuando falta endDate", () => {
    const portfolio = getPortfolio("es");
    for (const item of portfolio.experience.items) {
      expect(item.isCurrent).toBe(!item.endDate);
    }
  });
});

describe("paridad ES/EN de datos profesionales", () => {
  const es = getResume("es");
  const en = getResume("en");

  test("misma cantidad de experiencias", () => {
    expect(en.work.length).toBe(es.work.length);
  });

  test("misma cantidad de proyectos", () => {
    expect(en.projects.length).toBe(es.projects.length);
  });

  test("misma cantidad de educación", () => {
    expect(en.education.length).toBe(es.education.length);
  });

  test("mismos grupos de skills y mismas cantidades de keywords", () => {
    expect(en.skills.length).toBe(es.skills.length);
    es.skills.forEach((group, index) => {
      expect(en.skills[index]?.keywords.length).toBe(group.keywords.length);
    });
  });

  test("mismos grupos de x-practices y mismas cantidades de keywords", () => {
    expect(en["x-practices"].length).toBe(es["x-practices"].length);
    es["x-practices"].forEach((practice, index) => {
      expect(en["x-practices"][index]?.keywords.length).toBe(
        practice.keywords.length,
      );
    });
  });

  test("misma cantidad de x-focusAreas", () => {
    expect(en.basics["x-focusAreas"].length).toBe(
      es.basics["x-focusAreas"].length,
    );
  });

  test("mismas claves x-* en basics", () => {
    const xKeysOf = (basics: Record<string, unknown>) =>
      Object.keys(basics)
        .filter((key) => key.startsWith("x-"))
        .sort();
    expect(xKeysOf(en.basics)).toEqual(xKeysOf(es.basics));
  });

  test("mismas claves x-* en la raíz del resume", () => {
    const xKeysOf = (resume: Record<string, unknown>) =>
      Object.keys(resume)
        .filter((key) => key.startsWith("x-"))
        .sort();
    expect(xKeysOf(en)).toEqual(xKeysOf(es));
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
