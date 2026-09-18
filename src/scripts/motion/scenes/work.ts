/** 04 · Trabajo seleccionado: el portal se abre sobre la escena siguiente. */
import { section, motionEl, motionEls } from "../kit";
import type { Kit } from "../kit";

/**
 * La O de WORK es una ventana que escala con scrub hasta cubrir el viewport
 * y da paso a EcuStock; "Selected" sale hacia arriba y las letras se
 * separan a los lados. Mobile y desktop comparten el mecanismo (escena
 * fijada sin espaciado, EcuStock entrando por debajo): solo cambian la
 * composición y los recorridos.
 */
export function workScene({ gsap }: Kit, desk: boolean): void {
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
