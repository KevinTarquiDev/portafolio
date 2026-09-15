/**
 * Escenas del portfolio en orden de scroll. El id es el ancla de la
 * sección; lo usan el HUD, los rótulos numerados y motion.ts.
 *
 * No importa nada de la capa de datos: motion.ts lo incluye en el bundle
 * del cliente y no debe arrastrar el resume.
 */
export const SCENE_IDS = [
  "top",
  "about",
  "experience",
  "work",
  "featured",
  "stack",
  "practices",
  "education",
  "contact",
] as const;

export type SceneId = (typeof SCENE_IDS)[number];

/** Número de escena con dos dígitos ("01", "02", ...). */
export function sceneIndex(id: SceneId): string {
  return String(SCENE_IDS.indexOf(id) + 1).padStart(2, "0");
}

/**
 * Media query de la composición desktop. Debe coincidir con la variante
 * `desk` de global.css y con las media queries de los componentes.
 */
export const DESK_MEDIA_QUERY =
  "(min-width: 1024px) and (min-aspect-ratio: 1/1)";

/** Total de escenas con dos dígitos ("09"). */
export const SCENE_TOTAL = String(SCENE_IDS.length).padStart(2, "0");
