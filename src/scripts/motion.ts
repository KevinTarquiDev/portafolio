/**
 * Coreografía GSAP + ScrollTrigger del portfolio, siguiendo las notas de
 * animación del artifact escena por escena.
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

import { DESK_MEDIA_QUERY, SCENE_IDS } from "../lib/scenes";
import type { SceneId } from "../lib/scenes";

type Gsap = typeof import("gsap").gsap;
type ScrollTriggerApi = typeof import("gsap/ScrollTrigger").ScrollTrigger;

interface Kit {
  gsap: Gsap;
  ScrollTrigger: ScrollTriggerApi;
}

type Cleanup = () => void;

/** Colores de global.css usados como extremos de interpolación. */
const COLOR_DIM = "#9a92ad";
const COLOR_INK = "#f2eef7";

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
    sceneHandoffs(kit, desk);

    return () => {
      for (const cleanup of cleanups) {
        cleanup();
      }
    };
  });

  setupHud(kit);
  setupCursor(gsap);
  ScrollTrigger.refresh();
  setupBreakpointContinuity(kit);
}

/* -------------------------------------------------------------------------- */
/* Utilidades                                                                 */
/* -------------------------------------------------------------------------- */

function section(id: string): HTMLElement | null {
  return document.getElementById(id);
}

function motionEl(root: ParentNode, name: string): HTMLElement | null {
  return root.querySelector<HTMLElement>(`[data-motion='${name}']`);
}

function motionEls(root: ParentNode, name: string): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(`[data-motion='${name}']`)];
}

/** Valor actual de --u en px (1px del artboard de referencia). */
function unit(): number {
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:absolute;visibility:hidden;height:0;width:calc(var(--u) * 1000)";
  document.body.appendChild(probe);
  const value = probe.getBoundingClientRect().width / 1000;
  probe.remove();
  return value;
}

interface ViewportLocation {
  id: SceneId;
  progress: number;
}

function sceneContainer(scene: HTMLElement): HTMLElement {
  const parent = scene.parentElement;
  return parent?.classList.contains("pin-spacer") ? parent : scene;
}

function sceneTravel(scene: HTMLElement, container: HTMLElement): number {
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
function setupBreakpointContinuity({ ScrollTrigger }: Kit): void {
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

/**
 * Parte un texto en letras animables y conserva las posiciones que tenían
 * con el kerning nativo. Así, al restaurar el texto no hay un salto final.
 */
function splitChars(element: HTMLElement): {
  chars: HTMLElement[];
  revert: Cleanup;
} {
  const original = element.textContent ?? "";
  const text = original.trim();
  element.textContent = text;

  const textNode = element.firstChild;
  const targetOffsets: number[] = [];
  if (textNode instanceof Text) {
    const elementLeft = element.getBoundingClientRect().left;
    const range = document.createRange();
    let offset = 0;
    for (const char of [...text]) {
      range.setStart(textNode, offset);
      offset += char.length;
      range.setEnd(textNode, offset);
      targetOffsets.push(range.getBoundingClientRect().left - elementLeft);
    }
  }

  element.textContent = "";
  const chars = [...text].map((char) => {
    const span = document.createElement("span");
    span.textContent = char;
    span.style.display = "inline-block";
    element.appendChild(span);
    return span;
  });

  chars.forEach((char, index) => {
    const targetOffset = targetOffsets[index];
    if (targetOffset === undefined) return;
    const elementLeft = element.getBoundingClientRect().left;
    const currentOffset = char.getBoundingClientRect().left - elementLeft;
    const kerningAdjustment = targetOffset - currentOffset;
    if (Math.abs(kerningAdjustment) > 0.01) {
      char.style.marginLeft = `${kerningAdjustment}px`;
    }
  });

  return {
    chars,
    revert: () => {
      element.textContent = original;
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Enlace entre escenas                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Revela los encabezados mientras entran en la zona de lectura. No transforma
 * el escenario: eso desplazaría los fondos, alteraría los sticky y atenuaría
 * controles que el visitante todavía está usando.
 */
function sceneHandoffs({ gsap }: Kit, desk: boolean): void {
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

/* -------------------------------------------------------------------------- */
/* HUD y cursor                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Oculta el header al bajar y lo revela al subir, solo en desktop: en
 * mobile el botón del menú vive en ese mismo header, así que ahí se
 * mantiene siempre visible.
 */
function headerAutoHide({ gsap, ScrollTrigger }: Kit, desk: boolean): Cleanup {
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
function setupHud({ gsap, ScrollTrigger }: Kit): void {
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
  const total = String(SCENE_IDS.length).padStart(2, "0");

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
    if (counterText) counterText.textContent = `${current.index} / ${total}`;
  };
  ScrollTrigger.create({
    trigger: document.body,
    start: "top top",
    end: "bottom bottom",
    refreshPriority: -1,
    onRefresh: () => {
      starts = SCENE_IDS.flatMap((id, index) => {
        const scene = section(id);
        return scene
          ? [
              {
                top:
                  sceneContainer(scene).getBoundingClientRect().top +
                  window.scrollY,
                index: String(index + 1).padStart(2, "0"),
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
function setupCursor(gsap: Gsap): void {
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

/* -------------------------------------------------------------------------- */
/* 01 · Inicio                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Entrada: la primera palabra llega desde la izquierda y la segunda desde
 * la derecha, letra a letra; el relleno morado sube con clip-path.
 */
function heroEntrance({ gsap }: Kit): Cleanup {
  const hero = section("top");
  if (!hero) {
    return () => {};
  }

  const splits: Cleanup[] = [];
  const revertSplits = () => {
    for (const revert of splits.splice(0)) {
      revert();
    }
  };

  const timeline = gsap.timeline({
    defaults: { ease: "power4.out", duration: 1.1 },
    onComplete: revertSplits,
  });

  const fromLeft = (element: HTMLElement | null, at: number) => {
    if (!element) return;
    const { chars, revert } = splitChars(element);
    splits.push(revert);
    timeline.from(chars, { xPercent: -160, opacity: 0, stagger: 0.06 }, at);
  };
  const fromRight = (element: HTMLElement | null, at: number) => {
    if (!element) return;
    const { chars, revert } = splitChars(element);
    splits.push(revert);
    timeline.from(
      chars,
      { xPercent: 160, opacity: 0, stagger: { each: 0.06, from: "end" } },
      at,
    );
  };

  fromLeft(motionEl(hero, "hero-first"), 0);

  const second = motionEl(hero, "hero-second");
  for (const layer of second?.children ?? []) {
    if (layer instanceof HTMLElement) fromRight(layer, 0.15);
  }
  const fill = motionEl(hero, "hero-fill");
  if (fill) {
    timeline.fromTo(
      fill,
      { clipPath: "inset(45% 0% 55% 0%)" },
      { clipPath: "inset(0% 0% 55% 0%)", duration: 1, ease: "power3.inOut" },
      0.9,
    );
  }

  const details = ["hero-meta", "hero-tagline", "hero-ctas"]
    .map((name) => motionEl(hero, name))
    .filter((element): element is HTMLElement => element !== null);
  timeline.from(
    details,
    { y: 24, opacity: 0, duration: 0.8, stagger: 0.1 },
    0.7,
  );

  const dot = motionEl(hero, "hero-dot");
  if (dot) {
    timeline.from(
      dot,
      { scale: 0, opacity: 0, duration: 0.6, ease: "back.out(2)" },
      1.2,
    );
  }

  // Red de seguridad: si la pestaña está en segundo plano y rAF no avanza,
  // el hero nunca debe quedarse a medio animar.
  const safety = window.setTimeout(() => timeline.progress(1), 3500);

  return () => {
    window.clearTimeout(safety);
    timeline.progress(1);
    revertSplits();
  };
}

/** El anillo discontinuo rota muy lento; el punto verde sigue su órbita. */
function heroOrbit({ gsap, ScrollTrigger }: Kit, desk: boolean): Cleanup {
  const hero = section("top");
  const ring = hero?.querySelector<HTMLElement>(".orbit-inner");
  const orbit = hero?.querySelector<HTMLElement>(".orbit-outer");
  const dot = hero ? motionEl(hero, "hero-dot") : null;
  if (!hero || !ring || !orbit || !dot) {
    return () => {};
  }

  let geometry = { radius: 0, angle: 0, dx: 0, dy: 0 };
  const measure = () => {
    gsap.set(dot, { x: 0, y: 0 });
    const ringBox = orbit.getBoundingClientRect();
    const dotBox = dot.getBoundingClientRect();
    // heroToAbout traslada .orbit-outer en "y" al hacer scroll cerca del
    // final del hero; sin descontarlo aquí, medir en ese instante captura
    // el anillo desplazado y la órbita queda descentrada.
    const ringOffsetY = Number(gsap.getProperty(orbit, "y")) || 0;
    const ringCenterX = ringBox.left + ringBox.width / 2;
    const ringCenterY = ringBox.top + ringBox.height / 2 - ringOffsetY;
    const dx = dotBox.left + dotBox.width / 2 - ringCenterX;
    const dy = dotBox.top + dotBox.height / 2 - ringCenterY;
    geometry = { radius: ringBox.width / 2, angle: Math.atan2(dy, dx), dx, dy };
  };
  measure();

  const state = { angle: 0 };
  const spin = gsap.to(ring, {
    rotation: 360,
    duration: 140,
    repeat: -1,
    ease: "none",
  });
  const travel = gsap.to(state, {
    angle: Math.PI * 2 * (desk ? 1 : -1),
    duration: 90,
    repeat: -1,
    ease: "none",
    onUpdate: () => {
      const angle = geometry.angle + state.angle;
      gsap.set(dot, {
        x: geometry.radius * Math.cos(angle) - geometry.dx,
        y: geometry.radius * Math.sin(angle) - geometry.dy,
      });
    },
  });

  // Solo gira mientras el hero está en pantalla.
  ScrollTrigger.create({
    trigger: hero,
    start: "top bottom",
    end: "bottom top",
    onRefresh: measure,
    onToggle: (self) => {
      // Recargar la página con scroll restaurado en una sección inferior
      // puede dejar la primera medición desalineada con el layout final;
      // al reentrar el Hero en pantalla se vuelve a medir para corregirlo.
      if (self.isActive) measure();
      for (const tween of [spin, travel]) {
        if (self.isActive) tween.play();
        else tween.pause();
      }
    },
  });

  return () => {
    gsap.set(dot, { clearProps: "x,y" });
  };
}

/**
 * Mantiene la profundidad del Hero mientras aparece About. La transición
 * sucede antes del pin de About, por lo que no añade espacio ni bloquea el
 * scroll nativo.
 */
function heroToAbout({ gsap }: Kit, desk: boolean): void {
  const hero = section("top");
  const about = section("about");
  if (!hero || !about) {
    return;
  }

  const outgoing = [
    hero.querySelector<HTMLElement>(".glow-purple"),
    hero.querySelector<HTMLElement>(".orbit-outer"),
  ].filter((element): element is HTMLElement => element !== null);
  const aboutGlow = about.querySelector<HTMLElement>(".about-glow");
  const vertical = motionEl(about, "about-vertical");

  if (outgoing.length > 0) {
    gsap.to(outgoing, {
      y: () => (desk ? 105 : 70) * unit(),
      opacity: 0.55,
      ease: "none",
      scrollTrigger: {
        trigger: hero,
        start: "55% top",
        end: "bottom top",
        scrub: 0.7,
        invalidateOnRefresh: true,
      },
    });
  }

  const incoming = [aboutGlow, vertical].filter(
    (element): element is HTMLElement => element !== null,
  );
  if (incoming.length > 0) {
    gsap.fromTo(
      incoming,
      { opacity: 0.28 },
      {
        opacity: 1,
        ease: "none",
        scrollTrigger: {
          trigger: about,
          start: "top bottom",
          end: "top 25%",
          scrub: 0.7,
        },
      },
    );
  }
}

/* -------------------------------------------------------------------------- */
/* 02 · Sobre mí                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Desktop: pin corto. En ambos formatos, el párrafo se enciende palabra a
 * palabra, BACKEND tiene parallax inverso y las bandas entran desde abajo.
 */
function aboutScene({ gsap }: Kit, desk: boolean): void {
  const about = section("about");
  if (!about) {
    return;
  }

  const words = [...about.querySelectorAll<HTMLElement>(".summary-word")];
  const vertical = motionEl(about, "about-vertical");
  const bandBack = motionEl(about, "about-band-back");
  const bandFront = motionEl(about, "about-band-front");
  if (desk) {
    const timeline = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: about,
        start: "top top",
        end: "+=110%",
        pin: true,
        scrub: 0.7,
        invalidateOnRefresh: true,
      },
    });
    timeline.fromTo(
      words,
      { color: COLOR_DIM },
      { color: COLOR_INK, duration: 0.34, stagger: 0.018 },
      0,
    );
    if (vertical) {
      timeline.fromTo(
        vertical,
        { y: () => -80 * unit() },
        { y: () => 80 * unit(), duration: 1 },
        0,
      );
    }
    // Entrada y contrapeso lateral de las bandas durante el pin.
    if (bandBack) {
      timeline.fromTo(
        bandBack,
        { x: () => -46 * unit(), y: () => 96 * unit(), opacity: 0 },
        {
          x: () => 46 * unit(),
          y: 0,
          opacity: 1,
          duration: 0.66,
        },
        0.2,
      );
    }
    if (bandFront) {
      timeline.fromTo(
        bandFront,
        { x: () => 46 * unit(), y: () => 128 * unit(), opacity: 0 },
        {
          x: () => -46 * unit(),
          y: 0,
          opacity: 1,
          duration: 0.66,
        },
        0.2,
      );
    }
    return;
  }

  gsap.fromTo(
    words,
    { color: COLOR_DIM },
    {
      color: COLOR_INK,
      stagger: 0.025,
      ease: "none",
      scrollTrigger: {
        trigger: motionEl(about, "about-summary"),
        start: "top 85%",
        end: "bottom 65%",
        scrub: 0.35,
      },
    },
  );
  if (vertical) {
    gsap.fromTo(
      vertical,
      { y: () => -40 * unit() },
      {
        y: () => 40 * unit(),
        ease: "none",
        scrollTrigger: {
          trigger: about,
          start: "top bottom",
          end: "bottom top",
          scrub: 0.5,
          invalidateOnRefresh: true,
        },
      },
    );
  }

  const bandTimeline = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: about,
      start: "bottom bottom",
      end: "+=65%",
      pin: true,
      anticipatePin: 1,
      scrub: 0.45,
      invalidateOnRefresh: true,
    },
  });
  if (bandBack) {
    bandTimeline.fromTo(
      bandBack,
      { x: () => -24 * unit(), y: () => 96 * unit(), opacity: 0 },
      { x: () => 24 * unit(), y: 0, opacity: 1, duration: 0.7 },
      0,
    );
  }
  if (bandFront) {
    bandTimeline.fromTo(
      bandFront,
      { x: () => 24 * unit(), y: () => 120 * unit(), opacity: 0 },
      { x: () => -24 * unit(), y: 0, opacity: 1, duration: 0.7 },
      0,
    );
  }
  const bands = [bandBack, bandFront].filter(
    (band): band is HTMLElement => band !== null,
  );
  bandTimeline.to(bands, { opacity: 1, duration: 0.3 }, 0.7);
}

/* -------------------------------------------------------------------------- */
/* 03 · Experiencia                                                           */
/* -------------------------------------------------------------------------- */

interface DigitRoll {
  element: HTMLElement;
  value: string;
}

const DIGIT_SLOT_STYLE =
  "display:inline-grid;overflow:hidden;vertical-align:top;padding:0.14em 0;margin:-0.14em 0";

function mountDigits(element: HTMLElement, value: string): DigitRoll {
  element.textContent = "";
  for (const char of value) {
    const slot = document.createElement("span");
    slot.style.cssText = DIGIT_SLOT_STYLE;
    const digit = document.createElement("span");
    digit.textContent = char;
    digit.style.gridArea = "1 / 1";
    slot.appendChild(digit);
    element.appendChild(slot);
  }
  return { element, value };
}

/** Cambia el año dígito a dígito con un giro vertical. */
function rollDigits(
  gsap: Gsap,
  roll: DigitRoll,
  next: string,
  direction: number,
): void {
  if (next === roll.value) {
    return;
  }

  if (next.length !== roll.value.length) {
    gsap.to(roll.element, {
      opacity: 0,
      duration: 0.2,
      overwrite: true,
      onComplete: () => {
        mountDigits(roll.element, next);
        gsap.to(roll.element, { opacity: 1, duration: 0.3 });
      },
    });
    roll.value = next;
    return;
  }

  [...next].forEach((char, index) => {
    const slot = roll.element.children[index];
    if (!(slot instanceof HTMLElement)) {
      return;
    }
    // Si hay un giro a medias, se queda solo el último dígito.
    while (slot.children.length > 1) {
      const stale = slot.firstElementChild;
      if (stale) {
        gsap.killTweensOf(stale);
        stale.remove();
      }
    }
    const current = slot.firstElementChild;
    if (!(current instanceof HTMLElement) || current.textContent === char) {
      return;
    }

    const incoming = document.createElement("span");
    incoming.textContent = char;
    incoming.style.gridArea = "1 / 1";
    slot.appendChild(incoming);

    const delay = index * 0.04;
    gsap.to(current, {
      yPercent: -115 * direction,
      duration: 0.5,
      delay,
      ease: "power3.inOut",
      onComplete: () => current.remove(),
    });
    gsap.fromTo(
      incoming,
      { yPercent: 115 * direction },
      { yPercent: 0, duration: 0.5, delay, ease: "power3.inOut" },
    );
  });
  roll.value = next;
}

/** Sustituye un texto con una máscara que barre en la dirección del scroll. */
function maskSwap(
  gsap: Gsap,
  running: WeakMap<HTMLElement, gsap.core.Timeline>,
  element: HTMLElement,
  text: string,
  direction: number,
): void {
  running.get(element)?.kill();
  const hidden =
    direction > 0 ? "inset(0% 0% 100% 0%)" : "inset(100% 0% 0% 0%)";
  const entering =
    direction > 0 ? "inset(100% 0% 0% 0%)" : "inset(0% 0% 100% 0%)";
  const timeline = gsap
    .timeline()
    .to(element, { clipPath: hidden, duration: 0.25, ease: "power2.in" })
    .add(() => {
      element.textContent = text;
    })
    .fromTo(
      element,
      { clipPath: entering },
      {
        clipPath: "inset(0% 0% 0% 0%)",
        duration: 0.45,
        ease: "power3.out",
        clearProps: "clipPath",
      },
    );
  running.set(element, timeline);
}

/**
 * Desktop: el recorrido depende del número de puestos. El año cambia dígito
 * a dígito con un giro vertical; empresa y rol entran con máscara, el nodo
 * baja por el riel y el nombre fantasma cambia con cada empresa.
 */
function experienceDesk({ gsap }: Kit): Cleanup {
  const experience = section("experience");
  if (!experience) {
    return () => {};
  }

  const jobs = motionEls(experience, "experience-job");
  const yearStart = motionEl(experience, "experience-year-start");
  const yearEnd = motionEl(experience, "experience-year-end");
  const detailIndex = motionEl(experience, "experience-detail-index");
  const company = motionEl(experience, "experience-detail-company");
  const position = motionEl(experience, "experience-detail-position");
  const ghost = motionEl(experience, "experience-ghost");
  const railActive = motionEl(experience, "experience-rail-active");
  const dot = motionEl(experience, "experience-dot");
  const first = jobs[0];
  if (
    jobs.length < 2 ||
    !first ||
    !yearStart ||
    !yearEnd ||
    !company ||
    !position
  ) {
    return () => {};
  }

  const initial = {
    start: yearStart.textContent ?? "",
    end: yearEnd.textContent ?? "",
    index: detailIndex?.textContent ?? "",
    company: company.textContent ?? "",
    position: position.textContent ?? "",
    ghost: ghost?.textContent ?? "",
  };

  const startRoll = mountDigits(yearStart, first.dataset.start ?? "");
  const endRoll = mountDigits(yearEnd, first.dataset.end ?? "");
  const running = new WeakMap<HTMLElement, gsap.core.Timeline>();
  let active = 0;

  const show = (next: number) => {
    const job = jobs[next];
    if (!job || next === active) {
      return;
    }
    const direction = next > active ? 1 : -1;
    jobs[active]?.classList.remove("is-active");
    job.classList.add("is-active");
    active = next;

    rollDigits(gsap, startRoll, job.dataset.start ?? "", direction);
    rollDigits(gsap, endRoll, job.dataset.end ?? "", direction);
    if (detailIndex)
      maskSwap(
        gsap,
        running,
        detailIndex,
        job.dataset.detailIndex ?? "",
        direction,
      );
    maskSwap(gsap, running, company, job.dataset.company ?? "", direction);
    maskSwap(gsap, running, position, job.dataset.position ?? "", direction);

    if (ghost) {
      running.get(ghost)?.kill();
      running.set(
        ghost,
        gsap
          .timeline()
          .to(ghost, {
            xPercent: -6 * direction,
            opacity: 0,
            duration: 0.3,
            ease: "power2.in",
          })
          .add(() => {
            ghost.textContent = (job.dataset.company ?? "").toUpperCase();
          })
          .fromTo(
            ghost,
            { xPercent: 6 * direction, opacity: 0 },
            { xPercent: 0, opacity: 1, duration: 0.7, ease: "power3.out" },
          ),
      );
    }
  };

  const progress = { value: 0 };
  gsap.to(progress, {
    value: 1,
    ease: "none",
    scrollTrigger: {
      trigger: experience,
      start: "top top",
      end: () => `+=${jobs.length * window.innerHeight * 0.7}`,
      pin: true,
      scrub: 0.65,
      invalidateOnRefresh: true,
    },
    onUpdate: () => {
      const step =
        gsap.utils.clamp(0, 1, (progress.value - 0.1) / 0.8) *
        (jobs.length - 1);
      const rowHeight = first.offsetHeight;
      const railTargets = [railActive, dot].filter(
        (element): element is HTMLElement => element !== null,
      );
      gsap.set(railTargets, { y: step * rowHeight });
      show(Math.round(step));
    },
  });

  return () => {
    jobs.forEach((job, index) =>
      job.classList.toggle("is-active", index === 0),
    );
    yearStart.textContent = initial.start;
    yearEnd.textContent = initial.end;
    if (detailIndex) detailIndex.textContent = initial.index;
    company.textContent = initial.company;
    position.textContent = initial.position;
    if (ghost) ghost.textContent = initial.ghost;
    gsap.set(
      [railActive, dot].filter(
        (element): element is HTMLElement => element !== null,
      ),
      { clearProps: "transform" },
    );
  };
}

/** Mobile: el puesto más próximo al centro del viewport activa la timeline. */
function experienceMobile({ gsap, ScrollTrigger }: Kit): Cleanup {
  const experience = section("experience");
  if (!experience) {
    return () => {};
  }
  const jobs = motionEls(experience, "experience-job");
  if (jobs.length === 0) {
    return () => {};
  }

  let active = 0;
  const setActive = (next: number) => {
    if (next === active) {
      return;
    }
    jobs[active]?.classList.remove("is-active");
    jobs[next]?.classList.add("is-active");
    active = next;
  };
  const updateActive = () => {
    const focus = window.innerHeight * 0.52;
    let nearest = 0;
    let distance = Number.POSITIVE_INFINITY;
    jobs.forEach((job, index) => {
      const box = job.getBoundingClientRect();
      const gap = Math.abs(box.top + box.height / 2 - focus);
      if (gap < distance) {
        distance = gap;
        nearest = index;
      }
    });
    setActive(nearest);
  };

  jobs.forEach((job) => {
    const body = job.querySelector<HTMLElement>(".job-body");
    if (!body) return;
    gsap.from(body, {
      opacity: 0,
      duration: 0.65,
      ease: "power3.out",
      scrollTrigger: {
        trigger: job,
        start: "top 92%",
        once: true,
      },
    });
  });

  ScrollTrigger.create({
    trigger: experience,
    start: "top bottom",
    end: "bottom top",
    onEnter: updateActive,
    onEnterBack: updateActive,
    onUpdate: updateActive,
    onRefresh: updateActive,
  });

  return () => {
    jobs.forEach((job, index) =>
      job.classList.toggle("is-active", index === 0),
    );
    active = 0;
  };
}

/* -------------------------------------------------------------------------- */
/* 04 · Trabajo seleccionado                                                  */
/* -------------------------------------------------------------------------- */

/**
 * La O de WORK es una ventana que escala con scrub hasta cubrir el viewport
 * y da paso a EcuStock; "Selected" sale hacia arriba y las letras se
 * separan a los lados. Mobile y desktop comparten el mecanismo (escena
 * fijada sin espaciado, EcuStock entrando por debajo): solo cambian la
 * composición y los recorridos.
 */
function workScene({ gsap }: Kit, desk: boolean): void {
  const work = section("work");
  const window_ = work ? motionEl(work, "work-window") : null;
  if (!work || !window_) {
    return;
  }

  const media = window_.querySelector<HTMLElement>(".window-media");

  /** Escala a la que el círculo cubre todo el viewport desde su centro. */
  const coverScale = () => {
    const box = window_.getBoundingClientRect();
    const radius = window_.offsetWidth / 2;
    const stageTop = work.getBoundingClientRect().top;
    const centerX = box.left + box.width / 2;
    const centerY = box.top + box.height / 2 - stageTop;
    const farthest = Math.max(
      Math.hypot(centerX, centerY),
      Math.hypot(window.innerWidth - centerX, centerY),
      Math.hypot(centerX, window.innerHeight - centerY),
      Math.hypot(window.innerWidth - centerX, window.innerHeight - centerY),
    );
    return (farthest / radius) * 1.04;
  };

  const timeline = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: work,
      start: "top top",
      end: () => `+=${work.offsetHeight}`,
      pin: true,
      pinSpacing: false,
      scrub: 0.7,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
  });

  const apart = desk ? 80 : 95;

  timeline
    .to(
      motionEl(work, "work-selected"),
      { yPercent: -140, opacity: 0, duration: 0.32 },
      0,
    )
    .to(motionEls(work, "work-meta"), { opacity: 0, duration: 0.2 }, 0)
    .to(motionEl(work, "work-window-dot"), { opacity: 0, duration: 0.15 }, 0)
    .to(
      motionEl(work, "work-w"),
      { xPercent: -apart, opacity: 0, duration: 0.5, ease: "power1.out" },
      0.1,
    )
    .to(
      motionEl(work, "work-rk"),
      { xPercent: apart, opacity: 0, duration: 0.5, ease: "power1.out" },
      0.1,
    )
    .to(
      window_,
      { scale: coverScale, duration: 0.9, ease: "power1.inOut" },
      0.05,
    )
    .to(window_, { opacity: 0, duration: 0.9, ease: "power1.out" }, 0.05)
    .to(motionEl(work, "work-glow"), { opacity: 0, duration: 0.75 }, 0.05)
    .to(work, { backgroundColor: "rgba(11, 8, 18, 0)", duration: 0.8 }, 0.15);

  if (media) {
    timeline.to(
      media,
      {
        borderColor: "rgba(95, 209, 138, 0)",
        duration: 0.65,
      },
      0.05,
    );
  }
}

/* -------------------------------------------------------------------------- */
/* 05 · EcuStock                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Desktop: pin + scroll horizontal de 2 viewports. Las capturas se mueven
 * a velocidades distintas, las palabras de fondo en sentido contrario y el
 * "01" se queda fijo.
 */
function featuredDesk({ gsap }: Kit): Cleanup {
  const featured = section("featured");
  const track = featured ? motionEl(featured, "featured-track") : null;
  if (!featured || !track) {
    return () => {};
  }

  // Los halos pueden sobresalir de los paneles; no forman parte del viaje.
  const travel = () => track.offsetWidth - featured.clientWidth;

  const timeline = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: featured,
      start: "top top",
      end: () => `+=${travel()}`,
      pin: true,
      scrub: 0.6,
      invalidateOnRefresh: true,
    },
  });

  timeline.to(track, { x: () => -travel() }, 0);

  const index = motionEl(featured, "featured-index");
  if (index) {
    timeline.fromTo(index, { x: 0 }, { x: travel }, 0);
  }
  // Las palabras recorren la pantalla hacia la derecha mientras el panel
  // avanza hacia la izquierda (desplazamiento neto del 15% del recorrido).
  const words = motionEl(featured, "featured-words");
  if (words) {
    timeline.fromTo(words, { x: () => -1.15 * travel() }, { x: 0 }, 0);
  }
  // Cada captura termina en su posición del diseño; durante el recorrido se
  // adelanta o retrasa según su velocidad. El factor limita el desfase para
  // que no se note el recorte del panel.
  const PARALLAX = 0.25;
  for (const media of motionEls(featured, "featured-media")) {
    const speed = Number(media.dataset.speed ?? "1");
    timeline.fromTo(
      media,
      { x: () => (speed - 1) * PARALLAX * travel() },
      { x: 0 },
      0,
    );
  }

  // Si el foco entra en la escena (Tab), se vuelve al inicio del recorrido
  // para que el enlace del primer panel esté siempre visible.
  const onFocus = () => {
    const trigger = timeline.scrollTrigger;
    if (trigger && trigger.progress > 0.5) {
      window.scrollTo({ top: trigger.start, behavior: "auto" });
    }
  };
  featured.addEventListener("focusin", onFocus);
  featuredToStack(gsap, featured);

  return () => featured.removeEventListener("focusin", onFocus);
}

/** Mobile: cada captura entra al ser visible y las palabras de fondo derivan. */
function featuredMobile({ gsap }: Kit): void {
  const featured = section("featured");
  if (!featured) {
    return;
  }
  for (const media of motionEls(featured, "featured-media")) {
    gsap.fromTo(
      media,
      { y: 28, opacity: 0.45 },
      {
        y: 0,
        opacity: 1,
        ease: "none",
        scrollTrigger: {
          trigger: media,
          start: "top 95%",
          end: "top 65%",
          scrub: 0.35,
        },
      },
    );
  }
  const words = motionEl(featured, "featured-words");
  if (words) {
    gsap.fromTo(
      words,
      { x: 0 },
      {
        x: () => 60 * unit(),
        ease: "none",
        scrollTrigger: {
          trigger: words,
          start: "top bottom",
          end: "bottom top",
          scrub: 0.5,
        },
      },
    );
  }
  featuredToStack(gsap, featured);
}

/** Enlaza los fondos de EcuStock y Stack conservando legibles las capturas. */
function featuredToStack(gsap: Gsap, featured: HTMLElement): void {
  const stack = section("stack");
  if (!stack) {
    return;
  }
  const outgoing = motionEl(featured, "featured-words");
  const stackGlow = stack.querySelector<HTMLElement>(".stack-glow");
  const transition = {
    trigger: stack,
    start: "top 78%",
    end: "top 28%",
    scrub: 0.7,
    invalidateOnRefresh: true,
  };

  if (outgoing) {
    gsap.to(outgoing, {
      y: () => -55 * unit(),
      opacity: 0.45,
      ease: "none",
      scrollTrigger: transition,
    });
  }
  if (stackGlow) {
    gsap.fromTo(
      stackGlow,
      { y: () => -90 * unit(), opacity: 0.25 },
      {
        y: 0,
        opacity: 1,
        ease: "none",
        scrollTrigger: transition,
      },
    );
  }
}

/* -------------------------------------------------------------------------- */
/* 06 · Stack                                                                 */
/* -------------------------------------------------------------------------- */

interface StackColumn {
  loop: HTMLElement;
  items: HTMLElement[];
  count: number;
  direction: number;
  focusIndex: number;
  centers: number[];
  distance: number;
  active: number;
}

/**
 * Desktop: pin; las columnas se desplazan en direcciones alternas con scrub
 * y la palabra que cruza la línea verde pasa de contorno a sólido.
 */
function stackDesk({ gsap }: Kit): Cleanup {
  const stack = section("stack");
  if (!stack) {
    return () => {};
  }

  const columns: StackColumn[] = motionEls(stack, "stack-column").flatMap(
    (column, index) => {
      const loop = motionEl(column, "stack-loop");
      if (!loop) {
        return [];
      }
      const items = [...loop.querySelectorAll<HTMLElement>(".item")];
      const focusIndex = items.findIndex((item) =>
        item.classList.contains("is-focus"),
      );
      return [
        {
          loop,
          items,
          count: Number(column.dataset.count ?? "1"),
          direction: index % 2 === 0 ? -1 : 1,
          focusIndex,
          centers: [],
          distance: 0,
          active: focusIndex,
        },
      ];
    },
  );

  const setActive = (column: StackColumn, next: number) => {
    if (next === column.active) {
      return;
    }
    if (column.active >= 0) {
      for (const offset of [-1, 0, 1]) {
        column.items[column.active + offset]?.classList.remove(
          "is-focus",
          "is-near",
        );
      }
    }
    if (next < 0) {
      column.active = -1;
      return;
    }
    column.items[next - 1]?.classList.add("is-near");
    column.items[next + 1]?.classList.add("is-near");
    column.items[next]?.classList.add("is-focus");
    column.active = next;
  };

  const progress = { value: 0 };
  const maxCount = Math.max(1, ...columns.map((column) => column.count));

  const apply = () => {
    const travelProgress = gsap.utils.clamp(
      0,
      1,
      (progress.value - 0.05) / 0.88,
    );
    for (const column of columns) {
      const y = column.direction * column.distance * travelProgress;
      gsap.set(column.loop, { y });
      if (progress.value > 0.96) {
        setActive(column, -1);
        continue;
      }
      const lineCenter = (column.centers[column.focusIndex] ?? 0) - y;
      let nearest = column.focusIndex;
      let best = Number.POSITIVE_INFINITY;
      column.centers.forEach((center, index) => {
        const gap = Math.abs(center - lineCenter);
        if (gap < best) {
          best = gap;
          nearest = index;
        }
      });
      setActive(column, nearest);
    }
  };

  const measure = () => {
    for (const column of columns) {
      gsap.set(column.loop, { y: 0 });
      column.centers = column.items.map(
        (item) => item.offsetTop + item.offsetHeight / 2,
      );
      const target = column.focusIndex - column.direction * column.count;
      const from = column.centers[column.focusIndex] ?? 0;
      const to = column.centers[target] ?? from;
      column.distance = Math.abs(to - from);
    }
    apply();
  };

  gsap.to(progress, {
    value: 1,
    ease: "none",
    scrollTrigger: {
      trigger: stack,
      start: "top top",
      end: () => `+=${Math.max(2, maxCount * 0.3) * window.innerHeight}`,
      pin: true,
      scrub: 0.7,
      onRefresh: measure,
      invalidateOnRefresh: true,
    },
    onUpdate: apply,
  });
  measure();

  return () => {
    for (const column of columns) {
      setActive(column, column.focusIndex);
      gsap.set(column.loop, { clearProps: "transform" });
    }
  };
}

/** Mobile: cada fila de tecnologías es una marquesina ligada al scroll. */
interface MobileStackRow {
  marquee: HTMLElement;
  items: HTMLElement[];
  count: number;
  toLeft: boolean;
  cycle: number;
  active: number;
}

function stackMobile({ gsap }: Kit): Cleanup {
  const stack = section("stack");
  if (!stack) {
    return () => {};
  }

  const rows: MobileStackRow[] = motionEls(stack, "stack-marquee").flatMap(
    (marquee, index) => {
      const column = marquee.closest<HTMLElement>("[data-count]");
      const items = [...marquee.querySelectorAll<HTMLElement>(".marquee-item")];
      const count = Number(column?.dataset.count ?? "0");
      if (count < 1 || items.length <= count) {
        return [];
      }
      return [
        {
          marquee,
          items,
          count,
          toLeft: index % 2 === 0,
          cycle: 0,
          active: -1,
        },
      ];
    },
  );
  if (rows.length === 0) {
    return () => {};
  }

  const setActive = (row: MobileStackRow, next: number) => {
    if (next === row.active) {
      return;
    }
    if (row.active >= 0) {
      row.items[row.active]?.classList.remove("is-focus");
      row.items[row.active - 1]?.classList.remove("is-near");
      row.items[row.active + 1]?.classList.remove("is-near");
    }
    row.items[next]?.classList.add("is-focus");
    row.items[next - 1]?.classList.add("is-near");
    row.items[next + 1]?.classList.add("is-near");
    row.active = next;
  };

  const progress = { value: 0 };
  const apply = () => {
    const focus = window.innerWidth * 0.54;
    for (const row of rows) {
      const x = row.toLeft
        ? -row.cycle * progress.value
        : -row.cycle * (1 - progress.value);
      gsap.set(row.marquee, { x });
      let nearest = 0;
      let best = Number.POSITIVE_INFINITY;
      row.items.forEach((item, index) => {
        const box = item.getBoundingClientRect();
        const gap = Math.abs(box.left + box.width / 2 - focus);
        if (gap < best) {
          best = gap;
          nearest = index;
        }
      });
      setActive(row, nearest);
    }
  };

  const measure = () => {
    for (const row of rows) {
      gsap.set(row.marquee, { x: 0 });
      const first = row.items[0];
      const repeated = row.items[row.count];
      row.cycle =
        first && repeated
          ? Math.abs(repeated.offsetLeft - first.offsetLeft)
          : row.marquee.scrollWidth / 3;
    }
    apply();
  };

  gsap.to(progress, {
    value: 1,
    ease: "none",
    scrollTrigger: {
      trigger: stack,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.7,
      invalidateOnRefresh: true,
      onRefresh: measure,
    },
    onUpdate: apply,
  });
  measure();

  return () => {
    for (const row of rows) {
      row.items.forEach((item) => item.classList.remove("is-focus", "is-near"));
      gsap.set(row.marquee, { clearProps: "transform" });
      row.active = -1;
    }
  };
}

/* -------------------------------------------------------------------------- */
/* 07 · Cómo trabajo                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Desktop: los anillos rotan con el scroll y el texto circular gira en
 * sentido contrario; cada nodo se enciende en orden y su título entra con
 * clip-path. Mobile: el riel se recorre ítem a ítem.
 */
function practicesScene({ gsap, ScrollTrigger }: Kit, desk: boolean): Cleanup {
  const practices = section("practices");
  if (!practices) {
    return () => {};
  }
  const items = motionEls(practices, "practices-item");
  const nodes = motionEls(practices, "practices-node");
  const circles = motionEls(practices, "practices-circle");
  const orbit = practices.querySelector<SVGElement>(
    "[data-motion='practices-orbit']",
  );
  if (items.length === 0) {
    return () => {};
  }

  let active = 0;
  const setActive = (next: number) => {
    if (next === active) {
      return;
    }
    items[active]?.classList.remove("is-active");
    items[next]?.classList.add("is-active");
    active = next;
  };
  const reset = () => {
    items.forEach((item, index) =>
      item.classList.toggle("is-active", index === 0),
    );
    active = 0;
  };

  if (!desk) {
    const railActive = motionEl(practices, "practices-rail-active");
    const glow = practices.querySelector<HTMLElement>(".practices-glow");
    const progress = { value: 0 };
    const apply = () => {
      if (railActive) {
        gsap.set(railActive, {
          scaleY: 0.08 + progress.value * 0.92,
          transformOrigin: "50% 0%",
        });
      }
      circles.forEach((circle, index) => {
        gsap.set(circle, {
          rotation: (index % 2 === 0 ? 28 : -28) * progress.value,
          scale: 1 + progress.value * 0.035,
        });
      });
      if (glow) {
        gsap.set(glow, { y: 36 * progress.value });
      }
    };

    gsap.to(progress, {
      value: 1,
      ease: "none",
      scrollTrigger: {
        trigger: items[0],
        endTrigger: items.at(-1),
        start: "center 65%",
        end: "center 45%",
        scrub: 0.7,
        invalidateOnRefresh: true,
      },
      onUpdate: apply,
    });
    apply();

    items.forEach((item, index) => {
      ScrollTrigger.create({
        trigger: item,
        start: "top 60%",
        onEnter: () => setActive(index),
        onLeaveBack: () => setActive(Math.max(0, index - 1)),
      });
      gsap.fromTo(
        item,
        { x: -16, opacity: 0.55 },
        {
          x: 0,
          opacity: 1,
          ease: "none",
          scrollTrigger: {
            trigger: item,
            start: "top 92%",
            end: "top 65%",
            scrub: 0.35,
          },
        },
      );
    });

    return () => {
      reset();
      if (railActive) gsap.set(railActive, { clearProps: "transform" });
      circles.forEach((circle) =>
        gsap.set(circle, { clearProps: "transform" }),
      );
      if (glow) gsap.set(glow, { clearProps: "transform" });
    };
  }

  const names = motionEls(practices, "practices-name");
  gsap.set(items, { opacity: 0.34 });
  gsap.set(nodes, { opacity: 0.24, scale: 0.65 });

  const timeline = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: practices,
      start: "top top",
      end: () => `+=${items.length * 0.5 * window.innerHeight}`,
      pin: true,
      scrub: 0.7,
      invalidateOnRefresh: true,
    },
  });
  circles.forEach((circle, index) => {
    timeline.to(
      circle,
      {
        rotation: index % 2 === 0 ? 50 : -50,
        duration: 1,
      },
      0,
    );
  });
  if (orbit) {
    timeline.to(
      orbit,
      {
        rotation: -70,
        transformOrigin: "50% 50%",
        duration: 1,
      },
      0,
    );
  }

  names.forEach((name, index) => {
    const at = 0.07 + index * 0.22;
    const node = nodes[index];
    const item = items[index];
    const previous = items[index - 1];
    if (previous) {
      timeline.to(previous, { opacity: 0.4, duration: 0.08 }, at);
    }
    if (item) {
      timeline.to(item, { opacity: 1, duration: 0.08 }, at);
    }
    if (node) {
      timeline.to(
        node,
        { opacity: 1, scale: 1, duration: 0.1, ease: "back.out(2)" },
        at,
      );
    }
    // Las prácticas de la derecha (02 y 03) se revelan desde su borde.
    const fromRight = index === 1 || index === 2;
    timeline.fromTo(
      name,
      { clipPath: fromRight ? "inset(0% 0% 0% 100%)" : "inset(0% 100% 0% 0%)" },
      {
        clipPath: "inset(0% 0% 0% 0%)",
        duration: 0.13,
        ease: "power3.out",
        clearProps: "clipPath",
      },
      at,
    );
  });

  return reset;
}

/* -------------------------------------------------------------------------- */
/* 08 · Educación                                                             */
/* -------------------------------------------------------------------------- */

/** La línea se dibuja del año de inicio al de fin y el punto llega al final. */
function educationScene({ gsap }: Kit, desk: boolean): void {
  const education = section("education");
  if (!education) {
    return;
  }

  for (const line of motionEls(education, "education-line")) {
    const timeline = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: line,
        start: "top 75%",
        end: "top 35%",
        scrub: 0.6,
      },
    });
    timeline.fromTo(
      line,
      { backgroundSize: desk ? "0% 100%" : "100% 0%" },
      { backgroundSize: "100% 100%" },
      0,
    );
    const dot = motionEl(line, "education-dot");
    if (desk && dot) {
      timeline.fromTo(dot, { x: () => -line.offsetWidth }, { x: 0 }, 0);
    }
  }

  for (const glow of education.querySelectorAll<HTMLElement>(
    ".education-glow",
  )) {
    gsap.fromTo(
      glow,
      { y: () => -45 * unit(), opacity: 0.55 },
      {
        y: () => 65 * unit(),
        opacity: 1,
        ease: "none",
        scrollTrigger: {
          trigger: education,
          start: "top bottom",
          end: "bottom top",
          scrub: 0.8,
          invalidateOnRefresh: true,
        },
      },
    );
  }
}

/* -------------------------------------------------------------------------- */
/* 09 · Contacto                                                              */
/* -------------------------------------------------------------------------- */

/**
 * El título se asienta con una escala leve, el punto verde llega a su
 * posición y cada dato o formulario aparece cuando entra en pantalla.
 */
function contactScene({ gsap }: Kit, desk: boolean): void {
  const contact = section("contact");
  if (!contact) {
    return;
  }

  const title = motionEl(contact, "contact-title");
  if (desk && title) {
    gsap.fromTo(
      title,
      { scale: 1.08, transformOrigin: "0% 100%" },
      {
        scale: 1,
        ease: "power2.out",
        scrollTrigger: {
          trigger: contact,
          start: "top bottom",
          end: "top 20%",
          scrub: 0.6,
        },
      },
    );
  }
  if (!desk) {
    gsap.from(motionEls(contact, "contact-line"), {
      y: 48,
      opacity: 0,
      duration: 0.8,
      stagger: 0.1,
      ease: "power3.out",
      scrollTrigger: {
        trigger: title ?? contact,
        start: "top 80%",
        once: true,
      },
    });
  }

  const dots = motionEls(contact, "contact-dot").filter(
    (dot) => dot.offsetParent !== null,
  );
  for (const dot of dots) {
    gsap.fromTo(
      dot,
      { y: () => -220 * unit(), scale: 0.3, opacity: 0 },
      {
        y: 0,
        scale: 1,
        opacity: 1,
        duration: 1,
        ease: "bounce.out",
        scrollTrigger: {
          trigger: dot,
          start: "top 75%",
          toggleActions: "play none none reverse",
          invalidateOnRefresh: true,
        },
      },
    );
  }

  const glow = motionEl(contact, "contact-glow");
  if (glow) {
    gsap.fromTo(
      glow,
      { opacity: 0.15 },
      {
        opacity: 1,
        ease: "none",
        scrollTrigger: {
          trigger: contact,
          start: "top bottom",
          end: "bottom bottom",
          scrub: 0.8,
        },
      },
    );
  }

  const form = motionEl(contact, "contact-form");
  const rows = motionEls(contact, "contact-row");
  for (const element of [...rows, ...(form ? [form] : [])]) {
    gsap.from(element, {
      y: 20,
      opacity: 0,
      duration: 0.65,
      ease: "power3.out",
      scrollTrigger: {
        trigger: element,
        start: "top 92%",
        once: true,
      },
    });
  }
}
