import { describe, expect, test } from "bun:test";
import { getCvHref, slugify } from "./cv";

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
