/** 07 · Como trabajo: anillos que rotan y nodos que se encienden en orden. */
import { section, motionEl, motionEls } from "../kit";
import type { Kit, Cleanup } from "../kit";

/**
 * Desktop: los anillos rotan con el scroll y el texto circular gira en
 * sentido contrario; cada nodo se enciende en orden y su título entra con
 * clip-path. Mobile: el riel se recorre ítem a ítem.
 */
export function practicesScene(
  { gsap, ScrollTrigger }: Kit,
  desk: boolean,
): Cleanup {
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
  const firstItem = items[0];
  const lastItem = items.at(-1);
  if (!firstItem || !lastItem) {
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
        trigger: firstItem,
        endTrigger: lastItem,
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
