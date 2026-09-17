import { describe, expect, test } from "bun:test";
import {
  STACK_COLUMN_SIZES,
  balancedLineLength,
  stackColumnFontSize,
  stackColumnLoop,
  stackColumnSize,
} from "./stack";

describe("stackColumnSize", () => {
  test("devuelve el tamaño del diseño para las primeras columnas", () => {
    expect(
      STACK_COLUMN_SIZES.map((_, index) => stackColumnSize(index)),
    ).toEqual([...STACK_COLUMN_SIZES]);
  });

  test("recorre la lista en ciclo si hay más grupos que columnas", () => {
    expect(stackColumnSize(STACK_COLUMN_SIZES.length)).toBe(
      STACK_COLUMN_SIZES[0],
    );
  });
});

describe("balancedLineLength", () => {
  test("una palabra no se parte", () => {
    expect(balancedLineLength("Microservicios")).toBe(14);
  });

  test("reparte una frase en dos líneas equilibradas", () => {
    // "Modelado de" (11) | "bases de datos" (14)
    expect(balancedLineLength("Modelado de bases de datos")).toBe(14);
  });
});

describe("stackColumnFontSize", () => {
  test("mantiene el tamaño del diseño si todo cabe", () => {
    expect(stackColumnFontSize(["React", "Tailwind CSS"], 46)).toBe(46);
  });

  test("reduce el tamaño si una keyword no cabe en la columna", () => {
    expect(stackColumnFontSize(["Java", "Microservicios"], 58)).toBe(51);
  });

  test("las frases largas se calculan sobre su línea más larga", () => {
    expect(stackColumnFontSize(["Modelado de bases de datos"], 58)).toBe(51);
  });
});

describe("stackColumnLoop", () => {
  test("rodea la primera keyword con la lista circular", () => {
    expect(stackColumnLoop(["A", "B", "C"], 4)).toEqual({
      before: ["C", "A", "B", "C"],
      focus: "A",
      after: ["B", "C", "A", "B"],
    });
  });
});
