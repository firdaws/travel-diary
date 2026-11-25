"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImagePlus, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PHOTO_BUCKET, type PhotoItem } from "@/lib/photos";
import { Button } from "@/components/ui/button";

const MAX_BYTES = 5 * 1024 * 1024; // matches the bucket limit
const MAX_SIDE = 1600; // pixels; phone photos are far bigger than we need
const MAX_PHOTOS = 10; // matches the database limit
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

// Shrink big photos in the browser before uploading: faster and cheaper.
async function prepare(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= MAX_BYTES) return file;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't process image"))), "image/jpeg", 0.85),
  );
}

export default function TripPhotos({
  tripId,
  userId,
  photos,
  label,
}: {
  tripId: string;
  userId: string;
  photos: PhotoItem[];
  label: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    if (photos.length + files.length > MAX_PHOTOS) {
      return toast.error(`A trip can have up to ${MAX_PHOTOS} photos.`);
    }

    setBusy(true);
    let added = 0;
    for (const file of files) {
      if (!ALLOWED.includes(file.type)) {
        toast.error(`${file.name}: use a JPG, PNG or WebP image.`);
        continue;
      }
      try {
        const blob = await prepare(file);
        const ext = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
        // Path: <your user id>/<trip id>/<random name>. Storage rules check the first folder.
        const path = `${userId}/${tripId}/${crypto.randomUUID()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from(PHOTO_BUCKET)
          .upload(path, blob, { contentType: blob.type });
        if (uploadError) throw uploadError;

        const { error: rowError } = await supabase
          .from("trip_photos")
          .insert({ trip_id: tripId, storage_path: path });
        if (rowError) {
          await supabase.storage.from(PHOTO_BUCKET).remove([path]); // don't leave an orphan file
          throw rowError;
        }
        added++;
      } catch (err) {
        toast.error(`${file.name}: ${err instanceof Error ? err.message : "upload failed"}`);
      }
    }
    setBusy(false);
    if (added > 0) {
      toast.success(added === 1 ? "Photo added" : `${added} photos added`);
      router.refresh();
    }
  }

  async function remove(photo: PhotoItem) {
    // Delete the file first, then the row. RLS only allows your own.
    setRemoving(photo.id);
    const { error: fileError } = await supabase.storage.from(PHOTO_BUCKET).remove([photo.path]);
    if (fileError) {
      setRemoving(null);
      return toast.error(fileError.message);
    }
    const { error: rowError } = await supabase.from("trip_photos").delete().eq("id", photo.id);
    if (rowError) {
      setRemoving(null);
      return toast.error(rowError.message);
    }
    router.refresh();
    setRemoving(null);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {photos.map((p, i) => (
        <div key={p.id} className="group/photo relative">
          <a href={p.url} target="_blank" rel="noreferrer" aria-label={`Open photo ${i + 1} of ${label}`}>
            {/* Signed URLs change every hour, so we use a plain <img> instead of next/image. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.url}
              alt={`Photo ${i + 1} from ${label}`}
              loading="lazy"
              className="size-16 rounded-lg border object-cover"
            />
          </a>
          <button
            type="button"
            onClick={() => remove(p)}
            disabled={removing === p.id}
            aria-label={`Delete photo ${i + 1} of ${label}`}
            className="absolute -top-1.5 -right-1.5 flex size-5 cursor-pointer items-center justify-center rounded-full border bg-background text-muted-foreground opacity-0 shadow-sm transition hover:text-destructive focus-visible:opacity-100 group-hover/photo:opacity-100 max-md:opacity-100 disabled:opacity-100"
          >
            {removing === p.id ? <Loader2 className="size-3 animate-spin" /> : <X className="size-3" />}
          </button>
        </div>
      ))}

      {photos.length < MAX_PHOTOS && (
        <>
          <input ref={input} type="file" accept={ALLOWED.join(",")} multiple hidden onChange={onPick} />
          <Button
            type="button"
            variant="outline"
            size="sm"
            loading={busy}
            onClick={() => input.current?.click()}
          >
            {!busy && <ImagePlus />} {busy ? "Uploading…" : photos.length === 0 ? "Add photos" : "Add"}
          </Button>
        </>
      )}
    </div>
  );
}
