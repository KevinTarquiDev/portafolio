/**
 * Coreografía GSAP + ScrollTrigger del portfolio. Este archivo es solo el
 * arranque y el orquestador: cada escena vive en su propio módulo dentro
 * de ./motion, y ./motion/kit.ts reúne lo que comparten.
 *
 * Principios:
 * - Scroll nativo del navegador: sin smooth-scroll ni bloqueo de rueda o
 *   touch. Los pins y el scroll horizontal son ScrollTrigger con scrub,
 *   ligados a la posición de scroll real.
 * - Solo desktop (media query DESK_MEDIA_QUERY) usa escenas fijadas y
 *   scroll horizontal. Mobile mantiene el flujo vertical con animaciones
 *   ligeras.
 * - Nunca se importa si el visitante prefiere menos movimiento: el
 *   contenido ya es visible y legible con HTML/CSS estático.
 */

import { DESK_MEDIA_QUERY } from "../lib/scenes";
import type { Cleanup, Kit } from "./motion/kit";
import { headerAutoHide, setupCursor, setupHud } from "./motion/chrome";
import { sceneHandoffs } from "./motion/handoffs";
import { setupBreakpointContinuity } from "./motion/viewport";
import { heroEntrance, heroOrbit, heroToAbout } from "./motion/scenes/hero";
import { aboutScene } from "./motion/scenes/about";
import { experienceDesk, experienceMobile } from "./motion/scenes/experience";
import { workScene } from "./motion/scenes/work";
import { featuredDesk, featuredMobile } from "./motion/scenes/featured";
import { stackDesk, stackMobile } from "./motion/scenes/stack";
import { practicesScene } from "./motion/scenes/practices";
import { educationScene } from "./motion/scenes/education";
import { contactScene } from "./motion/scenes/contact";

/**
 * La entrada del Hero se reproduce una sola vez en toda la sesión, no una
 * por breakpoint: el callback de matchMedia se reejecuta en cada cambio
 * desktop/mobile y volver a lanzarla sería un parpadeo del titular.
 */
let entrancePlayed = false;

if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  void initMotion();
}

async function initMotion(): Promise<void> {
  const [{ gsap }, { ScrollTrigger }] = await Promise.all([
    import("gsap"),
    import("gsap/ScrollTrigger"),
  ]);
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  // Las escenas se miden y los titulares se parten en letras: hace falta
  // la tipografía definitiva antes de empezar.
  await document.fonts.ready;

  const kit: Kit = { gsap, ScrollTrigger };
  document.documentElement.classList.add("motion");

  const mm = gsap.matchMedia();
  mm.add({ desk: DESK_MEDIA_QUERY, any: "all" }, (context) => {
    const desk = context.conditions?.desk === true;
    const cleanups: Cleanup[] = [];

    if (!entrancePlayed) {
      entrancePlayed = true;
      cleanups.push(heroEntrance(kit));
    }

    // heroOrbit mide la posición que heroToAbout deja en el anillo, así
    // que se crea antes que él.
    cleanups.push(heroOrbit(kit, desk));
    heroToAbout(kit, desk);
    cleanups.push(headerAutoHide(kit, desk));

    // Orden de creación = orden del documento, necesario para que los
    // pins calculen bien el espacio que añaden.
    if (desk) {
      aboutScene(kit, true);
      cleanups.push(experienceDesk(kit));
      workScene(kit, true);
      cleanups.push(featuredDesk(kit));
      cleanups.push(stackDesk(kit));
      cleanups.push(practicesScene(kit, true));
    } else {
      aboutScene(kit, false);
      cleanups.push(experienceMobile(kit));
      workScene(kit, false);
      featuredMobile(kit);
      cleanups.push(stackMobile(kit));
      cleanups.push(practicesScene(kit, false));
    }
    educationScene(kit, desk);
    contactScene(kit, desk);
    // El último: sus ScrollTriggers apuntan a títulos de escenas ya fijadas.
    sceneHandoffs(kit, desk);

    return () => {
      for (const cleanup of cleanups) {
        cleanup();
      }
    };
  });

  // Fuera del matchMedia: se crean una sola vez, no por breakpoint.
  setupHud(kit);
  setupCursor(gsap);
  ScrollTrigger.refresh();
  setupBreakpointContinuity(kit);
}
