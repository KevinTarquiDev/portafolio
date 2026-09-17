import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { AA_NORMAL_TEXT, contrastRatio } from "./contrast";

const TOKEN_PATTERN = /--color-([\w-]+):\s*(#[0-9a-fA-F]{6})/g;

/**
 * Lee la paleta del bloque @theme de global.css, que es su única
 * definición. Copiar los hex aquí dejaba el test validando los valores
 * anteriores en cuanto se retocaba un color.
 */
function readColorTokens(): Map<string, string> {
  const css = readFileSync(
    new URL("../styles/global.css", import.meta.url),
    "utf8",
  );
  return new Map(
    [...css.matchAll(TOKEN_PATTERN)].map(([, name, value]) => [
      name as string,
      value as string,
    ]),
  );
}

const tokens = readColorTokens();

/** Falla si global.css ya no define el token, en vez de omitir el par. */
function token(name: string): string {
  const value = tokens.get(name);
  if (!value) {
    throw new Error(`global.css no define --color-${name}`);
  }
  return value;
}

/**
 * Pares [texto, fondo] realmente usados para texto informativo en las
 * escenas (no decorativo: --color-faint queda excluido a propósito).
 */
const textPairs: Array<[string, string]> = [
  ["ink", "bg"],
  ["body", "bg"],
  ["soft", "bg"],
  ["muted", "bg"],
  ["lilac", "bg"],
  ["green", "bg"],
  ["bg", "green"],
  ["ink", "deep"],
  ["muted", "deep"],
  ["soft", "deep"],
  ["ink", "panel"],
  ["muted", "panel"],
];

describe("contraste AA de los tokens de texto", () => {
  test.each(textPairs)("%s sobre %s cumple AA (4.5:1)", (fg, bg) => {
    const ratio = contrastRatio(token(fg), token(bg));
    expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });
});
