import { describe, expect, test } from "bun:test";
import { desktopType, mobileType } from "./fluidType";

describe("desktopType", () => {
  test("usa vw basado en un diseño de 1440px", () => {
    // 540px a 1440 de ancho -> 37.5vw
    expect(desktopType(540)).toBe("clamp(384px, 37.5vw, 720px)");
  });
});

describe("mobileType", () => {
  test("usa vw basado en un diseño de 390px", () => {
    // 200px a 390 de ancho -> 51.28vw
    expect(mobileType(200)).toBe("clamp(164.1px, 51.28vw, 393.33px)");
  });
});
