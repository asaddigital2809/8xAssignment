import { formatPrice, splitPrice } from "@/domain/money";

const SIZES = {
  sm: { dollar: "text-xs", whole: "text-lg", cents: "text-xs" },
  md: { dollar: "text-sm", whole: "text-2xl", cents: "text-sm" },
  lg: { dollar: "text-base", whole: "text-4xl", cents: "text-base" },
};

/** Amazon-style price: small "$", large dollars, superscript cents. Screen readers get the plain amount. */
export function Price({ cents, size = "md" }: { cents: number; size?: keyof typeof SIZES }) {
  const { whole, fraction } = splitPrice(cents);
  const s = SIZES[size];
  return (
    <span className="inline-flex items-start leading-none font-medium text-gray-900">
      <span className="sr-only">{formatPrice(cents)}</span>
      <span aria-hidden className={`${s.dollar} mt-0.5`}>
        $
      </span>
      <span aria-hidden className={s.whole}>
        {whole}
      </span>
      <span aria-hidden className={`${s.cents} mt-0.5`}>
        {fraction}
      </span>
    </span>
  );
}
