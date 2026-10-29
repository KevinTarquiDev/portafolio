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

let measured: { width: number; height: number; value: number } | null = null;

/**
 * Valor actual de --u en px (1px del artboard de referencia).
 *
 * Medirlo obliga a un layout sincrónico, y GSAP reevalúa de golpe las
 * decenas de callbacks `() => n * unit()` en cada refresh de
 * ScrollTrigger. Como --u se deriva solo del viewport, se recuerda la
 * última medida mientras sus dimensiones no cambien: así un refresh gasta
 * una medición en vez de una por callback. Cualquier cosa que altere el
 * valor (resize, rotación, aparición de la barra de scroll al fijar una
 * escena) cambia esas dimensiones y vuelve a medir.
 */
export function unit(): number {
  const { innerWidth: width, innerHeight: height } = window;
  if (measured?.width === width && measured.height === height) {
    return measured.value;
  }

  const probe = document.createElement("div");
  probe.style.cssText =
    "position:absolute;visibility:hidden;height:0;width:calc(var(--u) * 1000)";
  document.body.appendChild(probe);
  const value = probe.getBoundingClientRect().width / 1000;
  probe.remove();

  measured = { width, height, value };
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
