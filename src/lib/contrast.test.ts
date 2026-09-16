import { describe, expect, test } from "bun:test";
import { AA_NORMAL_TEXT, contrastRatio } from "./contrast";

/**
 * Tokens de src/styles/global.css. Si cambian ahí, deben actualizarse
 * aquí también: este test es la verificación automática de contraste
 * AA de la Fase 3 (el resto de comprobaciones de accesibilidad, con
 * Axe, se hacen en la Fase 8).
 */
const tokens = {
  bg: "#0b0812",
  ink: "#f2eef7",
  body: "#cfc7dc",
  soft: "#b7aec8",
  muted: "#9a92ad",
  lilac: "#c9b6f2",
  green: "#5fd18a",
  deep: "#2a1245",
  panel: "#150e22",
};

/**
 * Pares [texto, fondo] realmente usados para texto informativo en las
 * escenas (no decorativo: --color-faint queda excluido a propósito).
 */
const textPairs: Array<[keyof typeof tokens, keyof typeof tokens]> = [
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
    const ratio = contrastRatio(tokens[fg], tokens[bg]);
    expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });
});
