/**
 * Tipos y utilidades que comparten todas las escenas: el par
 * gsap/ScrollTrigger inyectado, los lectores de `data-motion` y las dos
 * convenciones de markup globales (el `pin-spacer` que inyecta
 * ScrollTrigger y el `.stage` pegajoso) de las que depende medir una
 * escena.
 */

export type Gsap = typeof import("gsap").gsap;
export type ScrollTriggerApi =
  typeof import("gsap/ScrollTrigger").ScrollTrigger;

export interface Kit {
  gsap: Gsap;
  ScrollTrigger: ScrollTriggerApi;
}

export type Cleanup = () => void;

export function section(id: string): HTMLElement | null {
  return document.getElementById(id);
}

export function motionEl(root: ParentNode, name: string): HTMLElement | null {
  return root.querySelector<HTMLElement>(`[data-motion='${name}']`);
}

export function motionEls(root: ParentNode, name: string): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(`[data-motion='${name}']`)];
}

/** Valor actual de --u en px (1px del artboard de referencia). */
export function unit(): number {
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:absolute;visibility:hidden;height:0;width:calc(var(--u) * 1000)";
  document.body.appendChild(probe);
  const value = probe.getBoundingClientRect().width / 1000;
  probe.remove();
  return value;
}

export function sceneContainer(scene: HTMLElement): HTMLElement {
  const parent = scene.parentElement;
  return parent?.classList.contains("pin-spacer") ? parent : scene;
}

export function sceneTravel(
  scene: HTMLElement,
  container: HTMLElement,
): number {
  if (container !== scene) {
    const pinTravel = container.offsetHeight - scene.offsetHeight;
    if (pinTravel > 0) {
      return pinTravel;
    }
  }

  const stage = scene.querySelector<HTMLElement>(".stage");
  if (stage && getComputedStyle(stage).position === "sticky") {
    return Math.max(1, scene.offsetHeight - window.innerHeight);
  }
  return Math.max(1, scene.offsetHeight);
}
