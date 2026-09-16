/**
 * Tamaños de tipografía fluida (clamp + vw) para los títulos gigantes
 * del diseño. Cada escena tiene dos composiciones independientes
 * (mobile y desktop, no una versión reducida de la otra), así que cada
 * una escala dentro de su propio rango de viewport.
 */

function fluidSize(
  px: number,
  base: number,
  minBasis: number,
  maxBasis: number,
): string {
  const vw = (px / base) * 100;
  const min = (px * minBasis) / base;
  const max = (px * maxBasis) / base;
  return `clamp(${round(min)}px, ${round(vw)}vw, ${round(max)}px)`;
}

function round(value: number): string {
  return Number(value.toFixed(2)).toString();
}

/**
 * Tamaño calculado sobre un diseño desktop de referencia a 1440px,
 * acotado entre su valor en 1024px (breakpoint `lg`) y 1920px.
 */
export function desktopType(px1440: number): string {
  return fluidSize(px1440, 1440, 1024, 1920);
}

/**
 * Tamaño calculado sobre un diseño mobile de referencia a 390px,
 * acotado entre su valor en 320px y en 767px (justo antes de `lg`).
 */
export function mobileType(px390: number): string {
  return fluidSize(px390, 390, 320, 767);
}
