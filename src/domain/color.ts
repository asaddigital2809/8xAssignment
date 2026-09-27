export type Rgb = { r: number; g: number; b: number };

/** Colors derived from a product image for tinting its card. */
export type AccentPalette = {
  /** The picked color, e.g. "rgb(52 120 200)". */
  accent: string;
  /** Very light tint for backgrounds. */
  soft: string;
  /** Medium tint for gradients/glows. */
  tint: string;
  /** Translucent accent for colored shadows. */
  glow: string;
};

function hsl({ r, g, b }: Rgb): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
  else if (max === gn) h = ((bn - rn) / d + 2) * 60;
  else h = ((rn - gn) / d + 4) * 60;
  return { h, s, l };
}

const HUE_BUCKETS = 12;

/**
 * Picks the most prominent *colorful* hue from RGBA pixel data. Product photos sit on
 * white/light-grey studio backgrounds, so near-white, near-black, grey and transparent
 * pixels are ignored; the remaining pixels vote by hue bucket, weighted by saturation.
 * Returns the average color of the winning bucket, or null for colorless images
 * (e.g. white earbuds), where callers fall back to a neutral palette.
 */
export function pickAccentColor(data: ArrayLike<number>, minShare = 0.02): Rgb | null {
  const weight = new Array<number>(HUE_BUCKETS).fill(0);
  const sums = Array.from({ length: HUE_BUCKETS }, () => ({ r: 0, g: 0, b: 0, n: 0 }));
  let considered = 0;

  for (let i = 0; i + 3 < data.length; i += 4) {
    const px = { r: data[i], g: data[i + 1], b: data[i + 2] };
    if (data[i + 3] < 200) continue;
    considered++;
    const { h, s, l } = hsl(px);
    if (s < 0.25 || l > 0.9 || l < 0.1) continue;
    const bucket = Math.floor(h / (360 / HUE_BUCKETS)) % HUE_BUCKETS;
    weight[bucket] += s * (1 - Math.abs(l - 0.5));
    const acc = sums[bucket];
    acc.r += px.r;
    acc.g += px.g;
    acc.b += px.b;
    acc.n++;
  }

  let best = -1;
  for (let b = 0; b < HUE_BUCKETS; b++) if (best === -1 || weight[b] > weight[best]) best = b;
  const winner = sums[best];
  // Require the color to cover a meaningful share of the image, not a few stray pixels.
  if (!winner || winner.n === 0 || considered === 0 || winner.n / considered < minShare) return null;
  return { r: Math.round(winner.r / winner.n), g: Math.round(winner.g / winner.n), b: Math.round(winner.b / winner.n) };
}

function fromHsl(h: number, s: number, l: number): Rgb {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return { r: Math.round(f(0) * 255), g: Math.round(f(8) * 255), b: Math.round(f(4) * 255) };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const css = ({ r, g, b }: Rgb, alpha?: number) => (alpha === undefined ? `rgb(${r} ${g} ${b})` : `rgb(${r} ${g} ${b} / ${alpha})`);

export const NEUTRAL_ACCENT: Rgb = { r: 100, g: 116, b: 139 }; // slate

/**
 * Shades keep the image color's *hue* but set saturation/lightness explicitly, so every
 * product gets a clearly colored yet light background (mixing a dark brown with white
 * would just give grey). The accent itself is normalized to a readable mid-tone.
 */
export function accentPalette(color: Rgb | null): AccentPalette {
  const { h, s } = hsl(color ?? NEUTRAL_ACCENT);
  const sat = color ? clamp(s, 0.45, 0.85) : 0.18;
  const accent = fromHsl(h, sat, 0.42);
  return {
    accent: css(accent),
    soft: css(fromHsl(h, sat * 0.7, 0.95)),
    tint: css(fromHsl(h, sat, 0.84)),
    glow: css(accent, 0.45),
  };
}
