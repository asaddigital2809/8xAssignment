"use client";

import { useEffect, useState } from "react";
import { accentPalette, pickAccentColor, type AccentPalette } from "@/domain/color";

// One sample per image URL for the whole session (cards re-render and re-mount a lot).
const cache = new Map<string, Promise<AccentPalette>>();
const resolved = new Map<string, AccentPalette>();

function sampleUrl(src: string): string {
  // Through Next's image optimizer: same-origin (no canvas tainting), tiny, cached.
  return `/_next/image?url=${encodeURIComponent(src)}&w=64&q=75`;
}

function sample(src: string): Promise<AccentPalette> {
  let pending = cache.get(src);
  if (!pending) {
    pending = new Promise<AccentPalette>((resolve) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        try {
          const size = 32;
          const canvas = document.createElement("canvas");
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) return resolve(accentPalette(null));
          ctx.drawImage(img, 0, 0, size, size);
          resolve(accentPalette(pickAccentColor(ctx.getImageData(0, 0, size, size).data)));
        } catch {
          resolve(accentPalette(null)); // e.g. a tainted canvas: fall back to neutral
        }
      };
      img.onerror = () => resolve(accentPalette(null));
      img.src = sampleUrl(src);
    }).then((palette) => {
      resolved.set(src, palette);
      return palette;
    });
    cache.set(src, pending);
  }
  return pending;
}

/**
 * The accent palette of an image, or null until it has been sampled. Purely decorative:
 * callers render a neutral look first and fade the color in.
 */
export function useImageAccent(src: string | undefined): AccentPalette | null {
  const [palette, setPalette] = useState<AccentPalette | null>(() => (src ? (resolved.get(src) ?? null) : null));
  useEffect(() => {
    if (!src) return;
    let alive = true;
    void sample(src).then((p) => alive && setPalette(p));
    return () => {
      alive = false;
    };
  }, [src]);
  return src ? (resolved.get(src) ?? palette) : null;
}
