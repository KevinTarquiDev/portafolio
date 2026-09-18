/**
 * Revelado de los encabezados al entrar en la zona de lectura. Barre
 * varias escenas a la vez por selector, asi que no pertenece a ninguna.
 */
import { section, unit } from "./kit";
import type { Kit } from "./kit";

/**
 * Revela los encabezados mientras entran en la zona de lectura. No transforma
 * el escenario: eso desplazaría los fondos, alteraría los sticky y atenuaría
 * controles que el visitante todavía está usando.
 */
export function sceneHandoffs({ gsap }: Kit, desk: boolean): void {
  for (const id of [
    "about",
    "experience",
    "stack",
    "practices",
    "education",
  ] as const) {
    const scene = section(id);
    if (!scene) continue;
    const titles = scene.querySelectorAll<HTMLElement>(
      ".title, .mobile-title, .years, .degree",
    );
    for (const title of titles) {
      if (title.offsetParent === null) continue;
      gsap.fromTo(
        title,
        { y: () => (desk ? 36 : 24) * unit(), opacity: 0.65 },
        {
          y: 0,
          opacity: 1,
          ease: "none",
          scrollTrigger: {
            trigger: title,
            start: "top 92%",
            end: "top 65%",
            scrub: 0.35,
            invalidateOnRefresh: true,
          },
        },
      );
    }
  }
}
