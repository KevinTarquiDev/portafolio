import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { DESK_MEDIA_QUERY, SCENE_IDS, SCENE_TOTAL, sceneIndex } from "./scenes";

const COMPONENTS_DIR = new URL("../components/", import.meta.url);
const GLOBAL_CSS = new URL("../styles/global.css", import.meta.url);

/**
 * La composición desktop se expresa tres veces por motivos técnicos: como
 * @custom-variant en global.css (para el markup), como cadena en scenes.ts
 * (para matchMedia en motion.ts) y como @media literal en el <style> de
 * cada escena. No se pueden unificar: `@variant desk` dentro de un <style>
 * scoped de Astro descarta las reglas en silencio, y `@reference` además
 * infla el CSS con fallbacks @supports. Estos tests son la alternativa:
 * que las tres copias no puedan divergir sin que falle el build.
 */

function readCustomVariant(): string {
  const css = readFileSync(GLOBAL_CSS, "utf8");
  const match = /@custom-variant\s+desk\s+\(@media\s+([\s\S]*?)\);/.exec(css);
  if (!match?.[1]) {
    throw new Error("global.css no declara @custom-variant desk");
  }
  return match[1].trim();
}

function componentStyles(): Array<{ file: string; css: string }> {
  return readdirSync(COMPONENTS_DIR)
    .filter((file) => file.endsWith(".astro"))
    .map((file) => ({
      file,
      css: readFileSync(new URL(file, COMPONENTS_DIR), "utf8"),
    }));
}

describe("breakpoint desk", () => {
  test("scenes.ts y global.css declaran la misma media query", () => {
    expect(DESK_MEDIA_QUERY).toBe(readCustomVariant());
  });

  test("cada @media de 1024px en los componentes es exactamente la de desk", () => {
    const wrong: string[] = [];
    let found = 0;

    for (const { file, css } of componentStyles()) {
      for (const match of css.matchAll(/@media\s+([^{]+)\{/g)) {
        const query = match[1]?.trim();
        if (!query?.includes("1024px")) {
          continue;
        }
        found += 1;
        if (query !== DESK_MEDIA_QUERY) {
          wrong.push(`${file}: ${query}`);
        }
      }
    }

    expect(wrong).toEqual([]);
    // Si nadie usa el breakpoint, el test de arriba pasaría en vacío.
    expect(found).toBeGreaterThan(0);
  });
});

describe("numeración de escenas", () => {
  test("sceneIndex numera desde 01 en el orden del scroll", () => {
    const first = SCENE_IDS[0];
    const last = SCENE_IDS[SCENE_IDS.length - 1];
    if (!first || !last) {
      throw new Error("SCENE_IDS no puede estar vacío");
    }
    expect(sceneIndex(first)).toBe("01");
    expect(sceneIndex(last)).toBe(SCENE_TOTAL);
  });

  test("SCENE_TOTAL coincide con el número de escenas", () => {
    expect(SCENE_TOTAL).toBe(String(SCENE_IDS.length).padStart(2, "0"));
  });
});
