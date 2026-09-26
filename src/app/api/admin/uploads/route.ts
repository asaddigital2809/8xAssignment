import { NextResponse } from "next/server";
import { BadRequestError } from "@/server/errors";
import { withAdmin } from "@/server/http";
import { createUpload } from "@/server/uploadService";

/** Product/category image upload (multipart field "file"). Same byte-level checks as review photos. */
export function POST(request: Request) {
  return withAdmin(async (admin) => {
    let file: FormDataEntryValue | null;
    try {
      file = (await request.formData()).get("file");
    } catch {
      throw new BadRequestError("Send the image as multipart/form-data.");
    }
    if (!(file instanceof File)) throw new BadRequestError("Choose an image to upload.");
    return NextResponse.json(await createUpload(admin.id, "product", new Uint8Array(await file.arrayBuffer())), { status: 201 });
  });
}
