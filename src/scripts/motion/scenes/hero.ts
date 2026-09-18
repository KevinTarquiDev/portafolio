/** 01 · Inicio: entrada del titular, orbita del anillo y salida hacia Sobre mi. */
import { section, motionEl, unit } from "../kit";
import type { Kit, Cleanup } from "../kit";

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

/**
 * Entrada: la primera palabra llega desde la izquierda y la segunda desde
 * la derecha, letra a letra; el relleno morado sube con clip-path.
 */
export function heroEntrance({ gsap }: Kit): Cleanup {
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
export function heroOrbit(
  { gsap, ScrollTrigger }: Kit,
  desk: boolean,
): Cleanup {
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
export function heroToAbout({ gsap }: Kit, desk: boolean): void {
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
