import { describe, expect, test } from "bun:test";
import { ui } from "./ui";

describe("ui", () => {
  test("es y en tienen exactamente las mismas claves anidadas", () => {
    expect(shapeOf(ui.en)).toEqual(shapeOf(ui.es));
  });

  test("ningún texto de interfaz está vacío", () => {
    expect(findEmptyStrings(ui.es, "ui.es")).toEqual([]);
    expect(findEmptyStrings(ui.en, "ui.en")).toEqual([]);
  });
});

/**
 * Describe la forma de un objeto (claves anidadas + tipo de cada hoja:
 * "string" o "array"), para comparar que ES y EN declaran las mismas
 * claves sin comparar sus valores.
 */
function shapeOf(value: unknown): unknown {
  if (Array.isArray(value)) {
    return "array";
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, entryValue]) => [key, shapeOf(entryValue)]),
    );
  }
  return typeof value;
}

function findEmptyStrings(value: unknown, path: string): string[] {
  if (typeof value === "string") {
    return value.trim() === "" ? [path] : [];
  }
  if (Array.isArray(value)) {
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
