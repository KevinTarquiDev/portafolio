import { describe, expect, test } from "bun:test";
import { buildCvDocument, getCvHref, slugify } from "./cv";
import { getResume, type Locale } from "./resume";

describe("slugify", () => {
  test("normaliza acentos y espacios", () => {
    expect(slugify("Kevin Tarqui")).toBe("kevin-tarqui");
    expect(slugify("Ingeniería de Software")).toBe("ingenieria-de-software");
  });
});

describe("getCvHref", () => {
  test("construye la ruta del PDF por locale", () => {
    expect(getCvHref("es")).toBe("/cv/kevin-tarqui-cv-es.pdf");
    expect(getCvHref("en")).toBe("/cv/kevin-tarqui-cv-en.pdf");
  });
});

const locales: Locale[] = ["es", "en"];

describe("buildCvDocument", () => {
  test.each(locales)("incluye todos los trabajos del resume (%s)", (locale) => {
    const resume = getResume(locale);
    const cv = buildCvDocument(locale);
    expect(cv.experience.length).toBe(resume.work.length);
    expect(cv.experience.map((item) => item.company)).toEqual(
      resume.work.map((job) => job.name),
    );
  });

  test.each(locales)(
    "incluye todos los proyectos y la educación (%s)",
    (locale) => {
      const resume = getResume(locale);
      const cv = buildCvDocument(locale);
      expect(cv.projects.length).toBe(resume.projects.length);
      expect(cv.education.length).toBe(resume.education.length);
      expect(cv.skills.length).toBe(resume.skills.length);
      expect(cv.languages.length).toBe(resume.languages.length);
    },
  );

  test.each(locales)("no incluye ninguna extensión x-* (%s)", (locale) => {
    const cv = buildCvDocument(locale);
    const serialized = JSON.stringify(cv);
    expect(serialized.includes("x-displayName")).toBe(false);
    expect(serialized.includes("x-practices")).toBe(false);
  });

  test("el nombre y label vienen de basics, no de x-displayName", () => {
    const cv = buildCvDocument("es");
    expect(cv.name).toBe("Kevin Andrés Tarqui Tapia");
    expect(cv.label).toBe("Desarrollador Full Stack");
  });
});
