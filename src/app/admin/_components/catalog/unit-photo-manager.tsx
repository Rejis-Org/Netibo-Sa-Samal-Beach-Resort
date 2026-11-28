"use client";

import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const BUCKET = "unit-photos";
const MAX_PHOTOS = 12;
const MAX_SIDE = 1600;
const MAX_ORIGINAL_BYTES = 25 * 1024 * 1024;

type Photo = { key: string; url: string };
type Pending = { key: string; name: string };

type Props = {
  /** Storage folder for new uploads, for example the unit id. */
  folder: string;
  /** Photo URLs or site paths that are already saved. */
  initial: string[];
  /** Called when the admin changes the list, so a parent form knows it has unsaved edits. */
  onChange?: () => void;
};

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

/** Shrinks a photo so its longest side is at most MAX_SIDE and re-encodes it (WebP, or JPEG where WebP is not supported). */
async function shrink(file: File) {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("no canvas");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const webp = await toBlob(canvas, "image/webp", 0.82);
  if (webp && webp.type === "image/webp") return { blob: webp, extension: "webp", type: "image/webp" };
  const jpeg = await toBlob(canvas, "image/jpeg", 0.85);
  if (!jpeg) throw new Error("no encoder");
  return { blob: jpeg, extension: "jpg", type: "image/jpeg" };
}

export function UnitPhotoManager({ folder, initial, onChange }: Props) {
  const [photos, setPhotos] = useState<Photo[]>(() => initial.map((url, index) => ({ key: `saved-${index}`, url })));
  const [pending, setPending] = useState<Pending[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const guard = useRef<HTMLInputElement>(null);
  const busy = pending.length > 0;

  useEffect(() => {
    guard.current?.setCustomValidity(busy ? "Wait for the photo upload to finish." : "");
  }, [busy]);

  function update(next: Photo[]) {
    setPhotos(next);
    onChange?.();
  }

  async function handleFiles(files: File[]) {
    if (files.length === 0) return;
    const room = Math.max(0, MAX_PHOTOS - photos.length - pending.length);
    const messages: string[] = [];
    if (files.length > room) messages.push(`Only ${MAX_PHOTOS} photos fit. ${files.length - room} not added.`);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setErrors(["Photo upload is not available: the database connection is not configured."]);
      return;
    }
    const accepted = files.slice(0, room);
    for (const file of accepted) {
      if (!file.type.startsWith("image/")) {
        messages.push(`${file.name}: this is not an image.`);
        continue;
      }
      if (file.size > MAX_ORIGINAL_BYTES) {
        messages.push(`${file.name}: the file is larger than 25 MB.`);
        continue;
      }
      const key = crypto.randomUUID();
      setPending((current) => [...current, { key, name: file.name }]);
      try {
        const { blob, extension, type } = await shrink(file);
        const path = `${folder}/${key}.${extension}`;
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(path, blob, { contentType: type, cacheControl: "31536000", upsert: false });
        if (error) throw error;
        const url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
        setPhotos((current) => [...current, { key, url }]);
        onChange?.();
      } catch {
        messages.push(`${file.name}: could not be uploaded. Use a JPG, PNG or WebP photo and try again.`);
      } finally {
        setPending((current) => current.filter((item) => item.key !== key));
      }
    }
    setErrors(messages);
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= photos.length) return;
    const next = [...photos];
    [next[index], next[target]] = [next[target], next[index]];
    update(next);
  }

  function makeCover(index: number) {
    const next = [...photos];
    const [chosen] = next.splice(index, 1);
    update([chosen, ...next]);
  }

  function remove(index: number) {
    update(photos.filter((_, position) => position !== index));
  }

  return (
    <div className="admin-field-wide admin-photos">
      <div className="admin-photos-head">
        <span>
          Photos{" "}
          <span>
            ({photos.length}/{MAX_PHOTOS})
          </span>
        </span>
        <button
          type="button"
          className="button button-small button-blue"
          disabled={busy || photos.length >= MAX_PHOTOS}
          onClick={() => fileInput.current?.click()}
        >
          + Add photos
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = "";
            void handleFiles(files);
          }}
        />
      </div>
      <p className="admin-photos-hint">
        The first photo is the cover. Any size works: each photo is shrunk to {MAX_SIDE} px before it is uploaded. The
        public card crops the cover to 4:3, and guests see the whole photo when they open it.
      </p>
      {errors.map((message) => (
        <p className="admin-photos-error" key={message}>
          {message}
        </p>
      ))}
      {(photos.length > 0 || busy) && (
        <div className="admin-photos-grid">
          {photos.map((photo, index) => (
            <div className="admin-photo" key={photo.key}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt={`Photo ${index + 1}`} loading="lazy" />
              {index === 0 && <span className="admin-photo-badge">Cover</span>}
              <div className="admin-photo-actions">
                <button type="button" aria-label="Move earlier" disabled={index === 0} onClick={() => move(index, -1)}>
                  ←
                </button>
                <button
                  type="button"
                  aria-label="Move later"
                  disabled={index === photos.length - 1}
                  onClick={() => move(index, 1)}
                >
                  →
                </button>
                <button type="button" disabled={index === 0} onClick={() => makeCover(index)}>
                  Cover
                </button>
                <button
                  type="button"
                  className="admin-photo-remove"
                  aria-label="Remove this photo"
                  onClick={() => remove(index)}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
          {pending.map((item) => (
            <div className="admin-photo" key={item.key}>
              <div className="admin-photo-uploading">Uploading {item.name}…</div>
            </div>
          ))}
        </div>
      )}
      <input type="hidden" name="photos" value={photos.map((photo) => photo.url).join("\n")} />
      <input
        ref={guard}
        className="admin-photo-guard"
        tabIndex={-1}
        aria-hidden="true"
        required
        readOnly
        value={busy ? "" : "ready"}
      />
    </div>
  );
}
