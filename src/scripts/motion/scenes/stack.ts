/** 06 · Stack: columnas que se desplazan y enfocan la palabra central. */
import { section, motionEl, motionEls } from "../kit";
import type { Kit, Cleanup } from "../kit";

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
export function stackDesk({ gsap }: Kit): Cleanup {
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

export function stackMobile({ gsap }: Kit): Cleanup {
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
