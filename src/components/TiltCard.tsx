"use client";

import { useRef, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import type { AccentPalette } from "@/domain/color";

/**
 * A card that tilts toward the pointer and shows a moving highlight. Pointer position is
 * written to CSS variables on the element (no React state per move, so no re-renders).
 * The accent palette colors the shadow, border and glow. Disabled under reduced motion.
 */
export function TiltCard({
  palette,
  className = "",
  children,
  maxTilt = 7,
}: {
  palette: AccentPalette | null;
  className?: string;
  children: ReactNode;
  maxTilt?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  function onMove(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      el.style.setProperty("--ry", `${(x - 0.5) * 2 * maxTilt}deg`);
      el.style.setProperty("--rx", `${(0.5 - y) * 2 * maxTilt}deg`);
      el.style.setProperty("--mx", `${x * 100}%`);
      el.style.setProperty("--my", `${y * 100}%`);
    });
  }

  function onLeave() {
    cancelAnimationFrame(frame.current);
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  }

  const style = {
    "--accent": palette?.accent ?? "rgb(100 116 139)",
    "--accent-soft": palette?.soft ?? "rgb(241 245 249)",
    "--accent-tint": palette?.tint ?? "rgb(226 232 240)",
    "--accent-glow": palette?.glow ?? "rgb(100 116 139 / 0.35)",
  } as CSSProperties;

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={style}
      className={`tilt-card group relative rounded-xl bg-white ring-1 ring-black/5 transition-[box-shadow,transform,--tw-ring-color] duration-300 ease-out hover:ring-[var(--accent)]/40 ${className}`}
    >
      {children}
      {/* Moving highlight that follows the pointer. */}
      <span aria-hidden className="tilt-shine pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </div>
  );
}
