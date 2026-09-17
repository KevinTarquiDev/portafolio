import { describe, expect, test } from "bun:test";
import source from "../../data/resume.json";
import { isTranslation, resolveLocale } from "./resume";

describe("resolveLocale", () => {
  test("sustituye pares { es, en } y conserva valores planos", () => {
    const value = {
      name: "Kruger Corp",
      position: { es: "Desarrollador", en: "Developer" },
      keywords: ["Java", { es: "Microservicios", en: "Microservices" }],
    };
    expect(resolveLocale(value, "en")).toEqual({
      name: "Kruger Corp",
      position: "Developer",
      keywords: ["Java", "Microservices"],
    });
  });

  test("un objeto con claves extra no es un par de traducción", () => {
    expect(isTranslation({ es: "a", en: "b", note: "c" })).toBe(false);
  });
});

describe("pares de traducción en data/resume.json", () => {
  test("todo par tiene es y en, del mismo tipo y sin textos vacíos", () => {
    expect(findInvalidPairs(source, "resume")).toEqual([]);
  });
});

function findInvalidPairs(value: unknown, path: string): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item: unknown, index) =>
      findInvalidPairs(item, `${path}[${index}]`),
    );
  }
  if (typeof value !== "object" || value === null) {
    return [];
  }
  if ("es" in value || "en" in value) {
    if (!isTranslation(value)) {
      return [`${path}: debe tener exactamente las claves es y en`];
    }
    const invalid =
      typeof value.es !== typeof value.en ||
      [value.es, value.en].some(
        (text) => typeof text === "string" && text.trim() === "",
      );
    return invalid ? [`${path}: traducciones incompatibles o vacías`] : [];
  }
  return Object.entries(value).flatMap(([key, item]) =>
    findInvalidPairs(item, `${path}.${key}`),
  );
}
