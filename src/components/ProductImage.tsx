"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

/** next/image with a visible fallback when the remote image fails (the CDN can time out). */
export function ProductImage({ alt, className = "", ...props }: ImageProps) {
  const [failedSrc, setFailedSrc] = useState<ImageProps["src"] | null>(null);

  if (failedSrc === props.src) {
    return (
      <div role="img" aria-label={alt} className="absolute inset-0 flex items-center justify-center bg-gray-100 text-xs text-gray-400">
        Image unavailable
      </div>
    );
  }
  return <Image alt={alt} className={className} onError={() => setFailedSrc(props.src)} {...props} />;
}
