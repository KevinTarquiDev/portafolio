/** 02 · Sobre mi: el parrafo se enciende palabra a palabra y las bandas entran. */
import { section, motionEl, unit } from "../kit";
import type { Kit } from "../kit";

/**
 * Valor de un token --color-* de global.css, que es la única definición
 * de la paleta: así los extremos de interpolación no se hardcodean aquí.
 */
function colorToken(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(`--color-${name}`)
    .trim();
}

/**
 * Desktop: pin corto. En ambos formatos, el párrafo se enciende palabra a
 * palabra, BACKEND tiene parallax inverso y las bandas entran desde abajo.
 */
export function aboutScene({ gsap }: Kit, desk: boolean): void {
  const about = section("about");
  if (!about) {
    return;
  }

  const words = [...about.querySelectorAll<HTMLElement>(".summary-word")];
  const vertical = motionEl(about, "about-vertical");
  const bandBack = motionEl(about, "about-band-back");
  const bandFront = motionEl(about, "about-band-front");
  const wordOff = colorToken("muted");
  const wordOn = colorToken("ink");
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
      { color: wordOff },
      { color: wordOn, duration: 0.34, stagger: 0.018 },
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
    { color: wordOff },
    {
      color: wordOn,
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
