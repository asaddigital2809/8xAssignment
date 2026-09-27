"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const TAGLINES = [
  "It's feeling a little light in here.",
  "Your cart is hungry. Feed it some deals.",
  "Free delivery on every order is waiting.",
  "Great finds are one click away.",
];

/** Animated empty state: a cart rolls in and rocks while products drop toward it. */
export function EmptyCart() {
  const [line, setLine] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setLine((n) => (n + 1) % TAGLINES.length), 3200);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="mx-auto my-10 flex max-w-md flex-col items-center text-center">
      <svg viewBox="0 0 220 170" className="empty-cart h-44 w-auto" aria-hidden>
        {/* ground shadow */}
        <ellipse className="empty-cart-shadow" cx="112" cy="156" rx="62" ry="6" fill="#0f1111" opacity="0.08" />
        {/* falling products (loop in turn) */}
        <g className="empty-cart-drop empty-cart-drop-1">
          <rect x="92" y="0" width="22" height="30" rx="4" fill="#232f3e" />
          <rect x="95" y="3" width="16" height="22" rx="2" fill="#7dd3fc" />
        </g>
        <g className="empty-cart-drop empty-cart-drop-2">
          <rect x="104" y="2" width="26" height="24" rx="3" fill="#febd69" />
          <path d="M104 12h26M117 2v24" stroke="#e38c19" strokeWidth="2" />
        </g>
        <g className="empty-cart-drop empty-cart-drop-3">
          <circle cx="112" cy="14" r="13" fill="#f97316" />
          <path d="M99 14h26M112 1c-6 7-6 19 0 26M112 1c6 7 6 19 0 26" stroke="#9a3412" strokeWidth="1.5" fill="none" />
        </g>
        {/* the cart */}
        <g className="empty-cart-body">
          <g className="empty-cart-lines" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round">
            <path d="M18 96h22M10 112h26M22 128h16" />
          </g>
          <path
            d="M44 58h16l18 72a6 6 0 0 0 6 5h76a6 6 0 0 0 6-4.5L180 78H66"
            fill="none"
            stroke="#131921"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M70 90h104l-8 30H78z" fill="#febd69" opacity="0.35" />
          <path d="M92 84v40M116 84v40M140 84v40M162 84l-3 38" stroke="#131921" strokeWidth="3" strokeLinecap="round" opacity="0.25" />
          <g className="empty-cart-wheel" style={{ transformOrigin: "90px 150px" }}>
            <circle cx="90" cy="150" r="8" fill="#131921" />
            <circle cx="90" cy="150" r="3" fill="#febd69" />
          </g>
          <g className="empty-cart-wheel" style={{ transformOrigin: "158px 150px" }}>
            <circle cx="158" cy="150" r="8" fill="#131921" />
            <circle cx="158" cy="150" r="3" fill="#febd69" />
          </g>
        </g>
      </svg>

      <h2 className="mt-4 text-2xl font-bold">Your cart is empty</h2>
      <p key={line} className="empty-cart-tagline mt-1 h-6 text-gray-600" aria-live="off">
        {TAGLINES[line]}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <Link href="/" className="rounded-full bg-cta px-5 py-2 text-sm font-medium shadow-sm hover:bg-cta-dark">
          Continue shopping
        </Link>
        <Link href="/search" className="rounded-full bg-white px-5 py-2 text-sm font-medium shadow-sm ring-1 ring-gray-300 hover:bg-gray-50">
          Browse all products
        </Link>
      </div>
    </div>
  );
}
