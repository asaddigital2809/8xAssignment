import { describe, expect, it } from "vitest";
import { accentPalette, pickAccentColor } from "./color";

/** Builds RGBA data from [count, [r,g,b,a]] runs. */
function pixels(...runs: [number, [number, number, number, number?]][]): Uint8ClampedArray {
  const out: number[] = [];
  for (const [n, [r, g, b, a = 255]] of runs) for (let i = 0; i < n; i++) out.push(r, g, b, a);
  return new Uint8ClampedArray(out);
}

describe("pickAccentColor", () => {
  it("ignores the white studio background and finds the product's color", () => {
    const img = pixels([900, [250, 250, 250]], [100, [30, 90, 200]]); // blue product on white
    expect(pickAccentColor(img)).toEqual({ r: 30, g: 90, b: 200 });
  });

  it("prefers the dominant, saturated hue over a small accent", () => {
    const img = pixels([600, [255, 255, 255]], [300, [200, 40, 40]], [100, [40, 180, 60]]);
    expect(pickAccentColor(img)).toEqual({ r: 200, g: 40, b: 40 });
  });

  it("returns null for colorless images (greys, black, white) so a neutral is used", () => {
    expect(pickAccentColor(pixels([500, [245, 245, 245]], [300, [120, 120, 120]], [200, [10, 10, 10]]))).toBeNull();
  });

  it("ignores transparent pixels and a few stray colored pixels", () => {
    expect(pickAccentColor(pixels([1000, [255, 0, 0, 0]]))).toBeNull();
    expect(pickAccentColor(pixels([990, [250, 250, 250]], [5, [0, 0, 255]]))).toBeNull();
  });

  it("averages the winning bucket", () => {
    const img = pixels([500, [255, 255, 255]], [100, [200, 100, 20]], [100, [220, 120, 40]]);
    expect(pickAccentColor(img)).toEqual({ r: 210, g: 110, b: 30 });
  });
});

describe("accentPalette", () => {
  const parse = (css: string) => css.match(/\d+/g)!.slice(0, 3).map(Number);
  const light = (css: string) => {
    const [r, g, b] = parse(css);
    return (Math.max(r, g, b) + Math.min(r, g, b)) / 2 / 255;
  };

  it("keeps the hue: a blue image gives blue shades (blue channel dominant)", () => {
    const p = accentPalette({ r: 0, g: 100, b: 200 });
    for (const shade of [p.accent, p.soft, p.tint]) {
      const [r, g, b] = parse(shade);
      expect(b).toBeGreaterThan(r);
      expect(b).toBeGreaterThanOrEqual(g);
    }
    expect(p.glow).toMatch(/\/ 0.45\)$/);
  });

  it("makes dark, dull colors into visible light tints (not grey)", () => {
    const p = accentPalette({ r: 48, g: 39, b: 25 }); // dark brown
    const [r, g, b] = parse(p.tint);
    expect(light(p.tint)).toBeGreaterThan(0.75);
    expect(r - b).toBeGreaterThan(30); // clearly warm, not neutral grey
    expect(g).toBeGreaterThan(b);
  });

  it("orders lightness soft > tint > accent", () => {
    const p = accentPalette({ r: 200, g: 40, b: 40 });
    expect(light(p.soft)).toBeGreaterThan(light(p.tint));
    expect(light(p.tint)).toBeGreaterThan(light(p.accent));
  });

  it("falls back to a muted neutral", () => {
    const [r, g, b] = parse(accentPalette(null).accent);
    expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeLessThan(40);
  });
});
