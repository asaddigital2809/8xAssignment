import { handle } from "@/server/http";
import { getImage } from "@/server/uploadService";

/**
 * Serves an uploaded image. Content-Type is the one detected at upload time; nosniff and
 * a locked-down CSP make sure the browser never treats the bytes as anything else.
 * Uploads are immutable, so they're cached aggressively.
 */
export function GET(_request: Request, { params }: RouteContext<"/api/images/[id]">) {
  return handle(async () => {
    const { contentType, data } = await getImage((await params).id);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  });
}
