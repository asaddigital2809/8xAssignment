import { NextResponse } from "next/server";
import { BadRequestError } from "@/server/errors";
import { withUser } from "@/server/http";
import { createUpload } from "@/server/uploadService";

/** Multipart upload of one image (field "file") for a review photo. Signed-in users only. */
export function POST(request: Request) {
  return withUser(async (user) => {
    let file: FormDataEntryValue | null;
    try {
      file = (await request.formData()).get("file");
    } catch {
      throw new BadRequestError("Send the image as multipart/form-data.");
    }
    if (!(file instanceof File)) throw new BadRequestError("Choose an image to upload.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    return NextResponse.json(await createUpload(user.id, "review", bytes), { status: 201 });
  });
}
