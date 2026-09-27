/** Read-only star rating, e.g. 4.3 -> ★★★★☆ with an accessible label. */
export function Stars({ rating, size = "text-base" }: { rating: number; size?: string }) {
  const full = Math.round(rating);
  return (
    <span role="img" aria-label={rating > 0 ? `${rating.toFixed(1)} out of 5 stars` : "No ratings yet"} className={`${size} leading-none tracking-tight text-amber-500`}>
      {"★".repeat(full)}
      <span className="text-gray-300">{"★".repeat(5 - full)}</span>
    </span>
  );
}
