"use client";

import { useEffect, useState } from "react";

/** Floating "back to top" button; appears only once the page has been scrolled down. */
export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => setVisible(window.scrollY > 400);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  const toTop = () => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  };

  return (
    <button
      type="button"
      onClick={toTop}
      aria-label="Back to top"
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      className={`fixed right-4 bottom-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-navy text-white shadow-lg ring-1 ring-white/20 transition duration-300 hover:bg-navy-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:right-6 sm:bottom-6 ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="m6 15 6-6 6 6" />
      </svg>
    </button>
  );
}
