/**
 * Cálculos de maquetación de la escena Stack (desktop). Las columnas del
 * diseño tienen un ancho fijo y tipografía gigante; como los skills reales
 * vienen de resume.json, el tamaño de cada columna se ajusta en build para
 * que su keyword más larga quepa sin invadir la columna vecina.
 */

/** Tamaños de fuente (px del artboard 1440) de cada columna del diseño. */
export const STACK_COLUMN_SIZES = [58, 46, 58, 80] as const;

/** Tamaño de diseño de la columna `index`, recorriendo la lista en ciclo. */
export function stackColumnSize(index: number): number {
  return (
    STACK_COLUMN_SIZES[index % STACK_COLUMN_SIZES.length] ??
    STACK_COLUMN_SIZES[0]
  );
}

/**
 * Ancho medio de un carácter de Bricolage Grotesque 800 al 75% de ancho,
 * en em. Medido en navegador sobre los skills reales (máximo observado
 * 0.373em); se redondea hacia arriba para no desbordar.
 */
const EM_PER_CHAR = 0.375;

/** Ancho útil de texto dentro de una columna de 300px (menos padding). */
export const STACK_COLUMN_TEXT_WIDTH = 270;

/**
 * Longitud (en caracteres) de la línea más larga de un keyword si se
 * reparte en dos líneas lo más equilibradas posible.
 */
export function balancedLineLength(keyword: string): number {
  const words = keyword.split(" ");
  if (words.length === 1) {
    return keyword.length;
  }

  let best = keyword.length;
  for (let split = 1; split < words.length; split++) {
    const first = words.slice(0, split).join(" ").length;
    const second = words.slice(split).join(" ").length;
    best = Math.min(best, Math.max(first, second));
  }
  return best;
}

/** Indica si un keyword cabe en una sola línea al tamaño dado. */
export function fitsOneLine(
  keyword: string,
  size: number,
  textWidth: number = STACK_COLUMN_TEXT_WIDTH,
): boolean {
  return keyword.length * EM_PER_CHAR * size <= textWidth;
}

/**
 * Tamaño de fuente de una columna: el del diseño, reducido solo si alguna
 * keyword no cabe en el ancho útil (ni en una línea ni en dos equilibradas).
 */
export function stackColumnFontSize(
  keywords: readonly string[],
  designSize: number,
  textWidth: number = STACK_COLUMN_TEXT_WIDTH,
): number {
  const longestLine = Math.max(
    ...keywords.map((keyword) =>
      fitsOneLine(keyword, designSize, textWidth)
        ? keyword.length
        : balancedLineLength(keyword),
    ),
  );

  const fitting = Math.floor(textWidth / (EM_PER_CHAR * longestLine));
  return Math.min(designSize, fitting);
}

/**
 * Secuencia circular de keywords alrededor de la palabra enfocada (la
 * primera): `before` son las anteriores en orden visual (de arriba abajo)
 * y `after` las siguientes. Se repiten para rellenar la columna y dejar
 * margen al desplazamiento animado.
 */
export function stackColumnLoop(
  keywords: readonly string[],
  rowsPerSide: number,
): { before: string[]; focus: string; after: string[] } {
  const count = keywords.length;
  const at = (offset: number): string =>
    keywords[((offset % count) + count) % count] ?? "";

  return {
    before: Array.from({ length: rowsPerSide }, (_, i) => at(i - rowsPerSide)),
    focus: at(0),
    after: Array.from({ length: rowsPerSide }, (_, i) => at(i + 1)),
  };
}
