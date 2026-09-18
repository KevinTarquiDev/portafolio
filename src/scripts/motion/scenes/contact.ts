/** 09 · Contacto: el titulo se asienta y los datos aparecen al entrar. */
import { section, motionEl, motionEls, unit } from "../kit";
import type { Kit } from "../kit";

/**
 * El título se asienta con una escala leve, el punto verde llega a su
 * posición y cada dato o formulario aparece cuando entra en pantalla.
 */
export function contactScene({ gsap }: Kit, desk: boolean): void {
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
