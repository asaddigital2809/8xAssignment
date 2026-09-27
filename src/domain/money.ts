const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const wholeFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export function formatPrice(cents: number): string {
  return formatter.format(cents / 100);
}

/** Price split for display as "$1,099" + superscript "99" (integer math, no float rounding). */
export function splitPrice(cents: number): { whole: string; fraction: string } {
  const safe = Math.max(0, Math.round(cents));
  return { whole: wholeFormatter.format(Math.floor(safe / 100)), fraction: String(safe % 100).padStart(2, "0") };
}

/** Estimated delivery for display only: `days` business days after `from` (skips weekends). */
export function estimatedDelivery(from: Date, days = 3): Date {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return d;
}
