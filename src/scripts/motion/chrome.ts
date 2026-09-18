/**
 * Cromo persistente del sitio, no ligado a una escena concreta: la
 * cabecera que se oculta al bajar, el HUD lateral con el indice de escena
 * y el cursor personalizado.
 */

import { SCENE_IDS, SCENE_TOTAL, sceneIndex } from "../../lib/scenes";
import { section, sceneContainer } from "./kit";
import type { Kit, Cleanup, Gsap } from "./kit";

/**
 * Oculta el header al bajar y lo revela al subir, solo en desktop: en
 * mobile el botón del menú vive en ese mismo header, así que ahí se
 * mantiene siempre visible.
 */
export function headerAutoHide(
  { gsap, ScrollTrigger }: Kit,
  desk: boolean,
): Cleanup {
  const header = document.querySelector<HTMLElement>("[data-hud]");
  if (!header) {
    return () => {};
  }

  if (!desk) {
    gsap.set(header, { clearProps: "transform" });
    return () => {};
  }

  const REVEAL_ZONE = 80; // px: cerca del top el header siempre queda visible
  let hidden = false;

  const setHidden = (next: boolean) => {
    if (next === hidden) return;
    hidden = next;
    gsap.to(header, {
      yPercent: next ? -100 : 0,
      duration: 0.35,
      ease: "power2.out",
      overwrite: true,
    });
  };

  const trigger = ScrollTrigger.create({
    trigger: document.body,
    start: "top top",
    end: "bottom bottom",
    // Igual que setupHud: se refresca después de los pins (que suman
    // espacio al documento) para medir el alto final real, si no su
    // "end" queda corto y deja de actualizar pasado ese punto.
    refreshPriority: -1,
    onUpdate: (self) => {
      if (self.scroll() <= REVEAL_ZONE) {
        setHidden(false);
        return;
      }
      setHidden(self.direction === 1);
    },
  });

  // El foco de teclado siempre revela la navegación, aunque el scroll
  // vaya hacia abajo: si no, un link enfocado quedaría fuera de vista.
  const onFocusIn = () => setHidden(false);
  header.addEventListener("focusin", onFocusIn);

  return () => {
    trigger.kill();
    header.removeEventListener("focusin", onFocusIn);
    gsap.set(header, { clearProps: "transform" });
  };
}

/** Índice, rótulo y barra de progreso del HUD ligados al scroll. */
export function setupHud({ gsap, ScrollTrigger }: Kit): void {
  const railIndex = document.querySelector<HTMLElement>(
    "[data-hud-rail-index]",
  );
  const railLabel = document.querySelector<HTMLElement>(
    "[data-hud-rail-label]",
  );
  const counterText = document.querySelector<HTMLElement>(
    "[data-hud-counter-text]",
  );
  const progress = document.querySelector<HTMLElement>("[data-hud-progress]");

  // Medir los contenedores incluye todo el recorrido de cada pin. Con
  // onToggle por sección, un salto de ancla puede omitir varias entradas.
  let starts: { top: number; index: string; label: string }[] = [];
  let active = "";
  const update = () => {
    const focus = window.scrollY + window.innerHeight * 0.5;
    const current = starts.findLast((scene) => scene.top <= focus);
    if (!current || current.index === active) return;
    active = current.index;
    if (railIndex) railIndex.textContent = current.index;
    if (railLabel) railLabel.textContent = current.label;
    if (counterText) {
      counterText.textContent = `${current.index} / ${SCENE_TOTAL}`;
    }
  };
  ScrollTrigger.create({
    trigger: document.body,
    start: "top top",
    end: "bottom bottom",
    refreshPriority: -1,
    onRefresh: () => {
      starts = SCENE_IDS.flatMap((id) => {
        const scene = section(id);
        return scene
          ? [
              {
                top:
                  sceneContainer(scene).getBoundingClientRect().top +
                  window.scrollY,
                index: sceneIndex(id),
                label: scene.dataset.sceneLabel ?? "",
              },
            ]
          : [];
      });
      update();
    },
    onUpdate: (self) => {
      if (progress) gsap.set(progress, { width: `${self.progress * 100}%` });
      update();
    },
  });
}

/** Cursor: anillo verde que crece sobre los CTAs (solo puntero fino). */
export function setupCursor(gsap: Gsap): void {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    return;
  }

  const cursor = document.createElement("div");
  cursor.setAttribute("aria-hidden", "true");
  cursor.style.cssText =
    "position:fixed;top:0;left:0;width:40px;height:40px;margin:-20px 0 0 -20px;" +
    "border-radius:9999px;border:1px solid var(--color-green);pointer-events:none;" +
    "z-index:50;opacity:0;transition:opacity .2s ease;";
  document.body.appendChild(cursor);

  const moveX = gsap.quickTo(cursor, "x", {
    duration: 0.35,
    ease: "power3.out",
  });
  const moveY = gsap.quickTo(cursor, "y", {
    duration: 0.35,
    ease: "power3.out",
  });

  window.addEventListener("pointermove", (event) => {
    moveX(event.clientX);
    moveY(event.clientY);
    cursor.style.opacity = "1";
  });

  for (const cta of document.querySelectorAll<HTMLElement>(
    "[data-cursor='cta']",
  )) {
    cta.addEventListener("mouseenter", () =>
      gsap.to(cursor, { scale: 2, duration: 0.25 }),
    );
    cta.addEventListener("mouseleave", () =>
      gsap.to(cursor, { scale: 1, duration: 0.25 }),
    );
  }
}
