"use client";

import type { useImageUploads } from "@/state/admin";

type Uploads = ReturnType<typeof useImageUploads>;

/** Upload/remove/reorder images. The first image is the primary one (product thumbnail). */
export function ImageUploader({ uploads, max, label = "Images" }: { uploads: Uploads; max: number; label?: string }) {
  return (
    <div className="space-y-2 text-sm">
      <p>
        {label} <span className="text-gray-500">(JPEG/PNG/WebP, 2 MB each{max > 1 ? `, up to ${max}; the first is the main image` : ""})</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {uploads.images.map((url, i) => (
          <div key={url} className={`relative h-24 w-24 overflow-hidden rounded border bg-white ${i === 0 && max > 1 ? "ring-2 ring-amber-400" : ""}`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of uploaded/catalog images */}
            <img src={url} alt="" className="h-full w-full object-contain" />
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/50 px-1 text-[11px] text-white">
              {i > 0 && max > 1 ? (
                <button type="button" onClick={() => uploads.makePrimary(url)}>
                  Make main
                </button>
              ) : (
                <span>{max > 1 ? "Main" : ""}</span>
              )}
              <button type="button" onClick={() => uploads.remove(url)} aria-label="Remove image">
                ✕
              </button>
            </div>
          </div>
        ))}
        {uploads.images.length < max && (
          <label className="flex h-24 w-24 cursor-pointer items-center justify-center rounded border border-dashed bg-white text-xs text-gray-600 hover:bg-gray-50">
            {uploads.uploading ? "Uploading…" : "+ Upload"}
            <input
              type="file"
              name="image"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={uploads.uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void uploads.add(file);
              }}
            />
          </label>
        )}
      </div>
      {uploads.error && <p role="alert" className="text-red-700">{uploads.error}</p>}
    </div>
  );
}
