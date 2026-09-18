/** 05 · EcuStock: scroll horizontal de dos paneles con parallax de capturas. */
import { section, motionEl, motionEls, unit } from "../kit";
import type { Kit, Cleanup, Gsap } from "../kit";

/**
 * Desktop: pin + scroll horizontal de 2 viewports. Las capturas se mueven
 * a velocidades distintas, las palabras de fondo en sentido contrario y el
 * "01" se queda fijo.
 */
export function featuredDesk({ gsap }: Kit): Cleanup {
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
export function featuredMobile({ gsap }: Kit): void {
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
