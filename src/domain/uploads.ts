export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

export type ImageType = "image/jpeg" | "image/png" | "image/webp";

/**
 * Identifies an image from its first bytes ("magic numbers"). The browser-supplied
 * Content-Type and file name are never trusted: a renamed HTML or SVG file must not be
 * stored and later served as an image.
 */
export function sniffImageType(bytes: Uint8Array): ImageType | null {
  const b = bytes;
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) {
    return "image/png";
  }
  if (
    b.length >= 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && // "RIFF"
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50 // "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

export function uploadProblem(bytes: Uint8Array): string | null {
  if (bytes.length === 0) return "That file is empty.";
  if (bytes.length > MAX_UPLOAD_BYTES) return "Images must be 2 MB or smaller.";
  if (!sniffImageType(bytes)) return "Only JPEG, PNG or WebP images are allowed.";
  return null;
}
