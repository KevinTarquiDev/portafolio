/**
 * Animaciones GSAP + ScrollTrigger del portfolio.
 *
 * Alcance de esta fase (ver IMPLEMENTATION_PLAN.md, Fase 4): en vez de
 * las escenas ancladas (pin) con crossfade de contenido descritas en
 * la coreografía original, se implementó un sistema de reveals y
 * transformaciones ligadas al scroll — mismo repertorio de recursos
 * (ScrollTrigger, timelines, matchMedia, parallax, rotación) pero sin
 * `pin: true`, priorizando robustez y accesibilidad sobre la fidelidad
 * literal del mockup animado. Ver el riesgo correspondiente en el plan.
 *
 * Nunca se importa si el visitante prefiere menos movimiento: en ese
 * caso todo el contenido ya es visible y legible vía HTML/CSS estático.
 */

const SCENES = [
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

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

if (!prefersReducedMotion()) {
  void initMotion();
}

async function initMotion(): Promise<void> {
  const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([
    import("gsap"),
    import("gsap/ScrollTrigger"),
  ]);

  gsap.registerPlugin(ScrollTrigger);
  document.documentElement.classList.add("motion");

  if (document.fonts) {
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  }

  setupHudScrollSpy(gsap, ScrollTrigger);
  setupHeroEntrance(gsap);
  setupSectionReveals(gsap, ScrollTrigger);

  const mm = gsap.matchMedia();
  mm.add(
    {
      isDesktop: "(min-width: 1024px) and (min-height: 640px)",
      isMobile: "(max-width: 1023px), (max-height: 639px)",
    },
    (context) => {
      const conditions = context.conditions as {
        isDesktop: boolean;
        isMobile: boolean;
      };

      if (conditions.isDesktop) {
        setupDesktopAccents(gsap);
      } else {
        setupMobileAccents(gsap, ScrollTrigger);
      }
    },
  );

  setupCursor(gsap);
}

/** Rail y barra de progreso del HUD, ligados al scroll global. */
function setupHudScrollSpy(
  gsap: typeof import("gsap").gsap,
  ScrollTrigger: typeof import("gsap/ScrollTrigger").ScrollTrigger,
): void {
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

  if (progress) {
    ScrollTrigger.create({
      trigger: document.body,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        gsap.set(progress, { width: `${self.progress * 100}%` });
      },
    });
  }

  const total = SCENES.length;

  SCENES.forEach((id, index) => {
    const section = document.getElementById(id);
    if (!section) {
      return;
    }

    const indexLabel = String(index + 1).padStart(2, "0");
    const label = section.dataset.sceneLabel ?? "";

    ScrollTrigger.create({
      trigger: section,
      start: "top center",
      end: "bottom center",
      onToggle: (self) => {
        if (!self.isActive) {
          return;
        }
        if (railIndex) railIndex.textContent = indexLabel;
        if (railLabel && label) railLabel.textContent = label;
        if (counterText) {
          counterText.textContent = `${indexLabel} / ${String(total).padStart(2, "0")}`;
        }
      },
    });
  });
}

/** Entrada inicial del Hero: nombre, headline, tagline y CTAs. */
function setupHeroEntrance(gsap: typeof import("gsap").gsap): void {
  const hero = document.getElementById("top");
  if (!hero) {
    return;
  }

  const headings = hero.querySelectorAll("h1");
  const rest = hero.querySelectorAll("h1 + div, h1 ~ p, h1 ~ div:last-of-type");
  // El nombre solo se anima en posición (y), nunca en opacidad: es el
  // primer elemento que ve el visitante y no debe depender de que una
  // animación de opacidad termine correctamente para ser legible.
  const timeline = gsap.timeline({
    defaults: { ease: "power3.out" },
    onComplete: () => gsap.set(rest, { clearProps: "opacity,transform" }),
  });
  timeline
    .from(headings, {
      y: 40,
      duration: 0.9,
      stagger: 0.12,
      clearProps: "transform",
    })
    .from(
      rest,
      {
        opacity: 0,
        y: 24,
        duration: 0.7,
        stagger: 0.08,
      },
      "-=0.4",
    );

  // Red de seguridad: si por lo que sea la animación no llega a
  // completarse (pestaña en segundo plano, rAF pausado), el contenido
  // del hero nunca debe quedar invisible.
  ensureVisible(gsap, [...rest], 2500);
}

/**
 * Fuerza opacity/transform limpios pasado `timeoutMs` si la animación
 * de entrada no ha terminado para entonces, para que el contenido
 * nunca quede oculto por una animación interrumpida.
 */
function ensureVisible(
  gsap: typeof import("gsap").gsap,
  targets: Element[],
  timeoutMs: number,
): void {
  window.setTimeout(() => {
    gsap.set(targets, { clearProps: "opacity,transform" });
  }, timeoutMs);
}

/**
 * Reveal genérico para el resto de escenas: cada sección aparece con
 * un ligero desplazamiento vertical al entrar en el viewport.
 */
function setupSectionReveals(
  gsap: typeof import("gsap").gsap,
  ScrollTrigger: typeof import("gsap/ScrollTrigger").ScrollTrigger,
): void {
  const sections = SCENES.slice(1)
    .map((id) => document.getElementById(id))
    .filter((section): section is HTMLElement => section !== null);

  ScrollTrigger.batch(sections, {
    start: "top 80%",
    onEnter: (batch) => {
      gsap.fromTo(
        batch,
        { opacity: 0, y: 48 },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: "power3.out",
          stagger: 0.1,
          overwrite: true,
          onComplete: () =>
            gsap.set(batch, { clearProps: "opacity,transform" }),
        },
      );
      ensureVisible(gsap, batch, 2500);
    },
    once: true,
  });
}

/** Acentos decorativos solo en desktop: anillos, línea de educación, columnas de stack. */
function setupDesktopAccents(gsap: typeof import("gsap").gsap): void {
  const practices = document.getElementById("practices");
  if (practices) {
    const rings = practices.querySelectorAll<HTMLElement>(
      "[data-motion='ring']",
    );
    rings.forEach((ring, index) => {
      gsap.to(ring, {
        rotation: index % 2 === 0 ? 40 : -40,
        ease: "none",
        scrollTrigger: {
          trigger: practices,
          start: "top bottom",
          end: "bottom top",
          scrub: 1,
        },
      });
    });
  }

  const education = document.getElementById("education");
  if (education) {
    const lines = education.querySelectorAll<HTMLElement>(
      "[data-motion='timeline-line']",
    );
    lines.forEach((line) => {
      gsap.fromTo(
        line,
        { scaleX: 0 },
        {
          scaleX: 1,
          ease: "none",
          transformOrigin: "left center",
          scrollTrigger: {
            trigger: line,
            start: "top 75%",
            end: "top 35%",
            scrub: 0.6,
          },
        },
      );
    });
  }

  const stack = document.getElementById("stack");
  if (stack) {
    const columns = stack.querySelectorAll<HTMLElement>(
      "[data-motion='stack-column']",
    );
    columns.forEach((column, index) => {
      gsap.to(column, {
        yPercent: index % 2 === 0 ? -6 : 6,
        ease: "none",
        scrollTrigger: {
          trigger: stack,
          start: "top bottom",
          end: "bottom top",
          scrub: 0.8,
        },
      });
    });
  }

  const contact = document.getElementById("contact");
  if (contact) {
    const title = contact.querySelector<HTMLElement>(
      "[data-motion='contact-title']",
    );
    const dot = contact.querySelector<HTMLElement>(
      "[data-motion='contact-dot']",
    );
    if (title) {
      gsap.fromTo(
        title,
        { scale: 1.15, transformOrigin: "left center" },
        {
          scale: 1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: contact,
            start: "top 70%",
            end: "top 20%",
            scrub: 0.6,
          },
        },
      );
    }
    if (dot) {
      gsap.fromTo(
        dot,
        { y: -48, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: contact,
            start: "top 60%",
            end: "top 30%",
            scrub: 0.6,
          },
        },
      );
    }
  }
}

/** En mobile, reveals ligeros por lote; sin parallax ni rotaciones. */
function setupMobileAccents(
  gsap: typeof import("gsap").gsap,
  ScrollTrigger: typeof import("gsap/ScrollTrigger").ScrollTrigger,
): void {
  const items = document.querySelectorAll<HTMLElement>(
    "#stack li, #practices li, #experience li",
  );
  if (items.length === 0) {
    return;
  }

  ScrollTrigger.batch(items, {
    start: "top 90%",
    onEnter: (batch) => {
      gsap.fromTo(
        batch,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          stagger: 0.05,
          overwrite: true,
          onComplete: () =>
            gsap.set(batch, { clearProps: "opacity,transform" }),
        },
      );
      ensureVisible(gsap, batch, 2000);
    },
    once: true,
  });
}

/** Cursor personalizado: solo con puntero fino y hover disponible. */
function setupCursor(gsap: typeof import("gsap").gsap): void {
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

  document
    .querySelectorAll<HTMLElement>("[data-cursor='cta']")
    .forEach((el) => {
      el.addEventListener("mouseenter", () =>
        gsap.to(cursor, { scale: 2, duration: 0.25 }),
      );
      el.addEventListener("mouseleave", () =>
        gsap.to(cursor, { scale: 1, duration: 0.25 }),
      );
    });
}
