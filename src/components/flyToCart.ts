/**
 * "Add to cart" flourish: a copy of the product image shrinks and arcs from where it sits
 * into the header's cart icon, which then gives a small bounce. Purely decorative — the
 * cart itself is updated by the store; with reduced motion only the bounce runs.
 */
const CART_TARGET = "[data-cart-target]";
const DURATION = 750;

export function flyToCart(image: HTMLImageElement | null) {
  const cart = document.querySelector<HTMLElement>(CART_TARGET);
  if (!cart) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const from = image?.getBoundingClientRect();
  const to = cart.getBoundingClientRect();
  if (reduced || !image || !from || from.width === 0 || typeof cart.animate !== "function") {
    bump(cart);
    return;
  }

  // Fly a square copy (the image is object-contain inside a square box).
  const size = Math.min(from.width, from.height);
  const startX = from.left + (from.width - size) / 2;
  const startY = from.top + (from.height - size) / 2;
  const endSize = 18;
  const dx = to.left + to.width / 2 - endSize / 2 - startX;
  const dy = to.top + to.height / 2 - endSize / 2 - startY;
  const end = endSize / size;

  const ghost = document.createElement("img");
  ghost.src = image.currentSrc || image.src;
  ghost.alt = "";
  ghost.setAttribute("aria-hidden", "true");
  Object.assign(ghost.style, {
    position: "fixed",
    left: `${startX}px`,
    top: `${startY}px`,
    width: `${size}px`,
    height: `${size}px`,
    objectFit: "contain",
    zIndex: "100",
    pointerEvents: "none",
    transformOrigin: "0 0",
    borderRadius: "16px",
    background: "#fff",
    boxShadow: "0 12px 30px rgb(0 0 0 / 0.25)",
    willChange: "transform, opacity",
  });
  document.body.appendChild(ghost);

  // Arc: rise a little first, then drop into the cart while shrinking.
  const lift = Math.min(120, Math.abs(dy) * 0.25);
  const flight = ghost.animate(
    [
      { transform: "translate(0, 0) scale(1)", opacity: 1, borderRadius: "16px" },
      { transform: `translate(${dx * 0.35}px, ${dy * 0.35 - lift}px) scale(${Math.max(end, 0.45)})`, opacity: 1, offset: 0.4 },
      { transform: `translate(${dx}px, ${dy}px) scale(${end})`, opacity: 0.2, borderRadius: "50%" },
    ],
    { duration: DURATION, easing: "cubic-bezier(.5,0,.3,1)", fill: "forwards" },
  );
  const done = () => {
    ghost.remove();
    bump(cart);
  };
  flight.onfinish = done;
  flight.oncancel = done;
}

function bump(cart: HTMLElement) {
  if (typeof cart.animate !== "function") return;
  cart.animate(
    [{ transform: "scale(1)" }, { transform: "scale(1.25) rotate(-8deg)" }, { transform: "scale(0.95) rotate(4deg)" }, { transform: "scale(1)" }],
    { duration: 450, easing: "ease-out" },
  );
}
