/** 03 · Experiencia: timeline con anos que giran digito a digito. */
import { section, motionEl, motionEls } from "../kit";
import type { Kit, Cleanup, Gsap } from "../kit";

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
export function experienceDesk({ gsap }: Kit): Cleanup {
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
export function experienceMobile({ gsap, ScrollTrigger }: Kit): Cleanup {
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
