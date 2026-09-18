/**
 * Continuidad al cambiar de breakpoint. Al alternar desktop/mobile GSAP
 * reconstruye los pins; esto conserva la escena visible y su progreso para
 * que esa reconstruccion no devuelva la pagina al Hero.
 */

import { DESK_MEDIA_QUERY, SCENE_IDS } from "../../lib/scenes";
import type { SceneId } from "../../lib/scenes";
import { section, sceneContainer, sceneTravel } from "./kit";
import type { Kit } from "./kit";

interface ViewportLocation {
  id: SceneId;
  progress: number;
}

/** Posición semántica actual para conservar la escena al cambiar breakpoint. */
function viewportLocation(): ViewportLocation | null {
  const focus = window.scrollY + window.innerHeight / 2;
  let located: { scene: HTMLElement; id: SceneId; top: number } | null = null;

  for (const id of SCENE_IDS) {
    const scene = section(id);
    if (!scene) {
      continue;
    }
    const container = sceneContainer(scene);
    const box = container.getBoundingClientRect();
    const top = box.top + window.scrollY;
    const bottom = top + box.height;
    if (focus >= top && focus <= bottom) {
      // En los solapes intencionales prevalece la escena posterior.
      located = { scene, id, top };
    }
  }

  if (!located) {
    return null;
  }
  const container = sceneContainer(located.scene);
  const travel = sceneTravel(located.scene, container);
  return {
    id: located.id,
    progress: Math.min(1, Math.max(0, (window.scrollY - located.top) / travel)),
  };
}

function restoreViewportLocation(location: ViewportLocation): void {
  const scene = section(location.id);
  if (!scene) {
    return;
  }
  const container = sceneContainer(scene);
  const top = container.getBoundingClientRect().top + window.scrollY;
  const travel = sceneTravel(scene, container);
  window.scrollTo({
    top: top + travel * location.progress,
    behavior: "auto",
  });
}

/**
 * Al alternar desktop/mobile GSAP reconstruye los pins. Conserva la escena y
 * su progreso relativo para que esa reconstrucción no devuelva la página al
 * Hero; no interviene en rueda, touch ni en el scroll ordinario.
 */
export function setupBreakpointContinuity({ ScrollTrigger }: Kit): void {
  const query = window.matchMedia(DESK_MEDIA_QUERY);
  let stableDesk = query.matches;
  let tracked = viewportLocation();
  let restoring = false;

  const remember = () => {
    if (restoring || query.matches !== stableDesk) {
      return;
    }
    tracked = viewportLocation() ?? tracked;
  };
  window.addEventListener("scroll", remember, { passive: true });

  query.addEventListener("change", (event) => {
    const saved = tracked;
    stableDesk = event.matches;
    if (!saved) {
      return;
    }
    restoring = true;
    requestAnimationFrame(() => {
      ScrollTrigger.refresh();
      requestAnimationFrame(() => {
        restoreViewportLocation(saved);
        ScrollTrigger.update();
        tracked = viewportLocation() ?? saved;
        restoring = false;
      });
    });
  });
}
