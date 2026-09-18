/** 08 · Educacion: la linea se dibuja del ano de inicio al de fin. */
import { section, motionEl, motionEls, unit } from "../kit";
import type { Kit } from "../kit";

/** La línea se dibuja del año de inicio al de fin y el punto llega al final. */
export function educationScene({ gsap }: Kit, desk: boolean): void {
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
