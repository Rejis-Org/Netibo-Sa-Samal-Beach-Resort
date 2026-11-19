"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";

type UnitGalleryProps = { name: string; photos: readonly string[] };

const MAX_PREVIEW_THUMBS = 3;

function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="m21 16-5-5-8 9" />
    </svg>
  );
}

function Arrow({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={direction === "left" ? "m15 5-7 7 7 7" : "m9 5 7 7-7 7"} />
    </svg>
  );
}

type LightboxProps = {
  name: string;
  photos: readonly string[];
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
};

function Lightbox({ name, photos, index, onIndex, onClose }: LightboxProps) {
  const t = useTranslations("gallery");
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const total = photos.length;

  const go = useCallback((delta: number) => onIndex((index + delta + total) % total), [index, total, onIndex]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
      if (event.key === "ArrowLeft") { go(-1); return; }
      if (event.key === "ArrowRight") { go(1); return; }
      if (event.key === "Tab" && dialogRef.current) {
        const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled])"));
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [go, onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  useEffect(() => {
    stripRef.current?.querySelector<HTMLElement>('[aria-current="true"]')?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [index]);

  return createPortal(
    <div className="unit-lightbox" role="dialog" aria-modal="true" aria-label={t("dialogLabel", { name })} ref={dialogRef}>
      <div className="unit-lightbox-bar">
        <div className="unit-lightbox-title">
          <strong>{name}</strong>
          <span aria-live="polite">{t("photoOf", { current: index + 1, total })}</span>
        </div>
        <button type="button" className="unit-lightbox-close" onClick={onClose} ref={closeRef} aria-label={t("close")}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      </div>
      <div
        className="unit-lightbox-stage"
        onTouchStart={(event) => { touchStartX.current = event.touches[0].clientX; }}
        onTouchEnd={(event) => {
          if (touchStartX.current === null || total < 2) return;
          const delta = event.changedTouches[0].clientX - touchStartX.current;
          touchStartX.current = null;
          if (Math.abs(delta) > 50) go(delta < 0 ? 1 : -1);
        }}
      >
        <Image key={photos[index]} className="unit-lightbox-image" src={photos[index]} alt={t("photoAlt", { name, number: index + 1, total })} fill sizes="100vw" priority />
        {total > 1 && (
          <>
            <button type="button" className="unit-lightbox-nav unit-lightbox-prev" onClick={() => go(-1)} aria-label={t("previous")}><Arrow direction="left" /></button>
            <button type="button" className="unit-lightbox-nav unit-lightbox-next" onClick={() => go(1)} aria-label={t("next")}><Arrow direction="right" /></button>
          </>
        )}
      </div>
      {total > 1 && (
        <div className="unit-lightbox-strip" ref={stripRef} role="group" aria-label={t("thumbnails")}>
          {photos.map((src, i) => (
            <button type="button" key={src} className="unit-lightbox-thumb" aria-current={i === index} aria-label={t("showPhoto", { number: i + 1 })} onClick={() => onIndex(i)}>
              <Image src={src} alt="" fill sizes="96px" />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}

export function UnitGallery({ name, photos }: UnitGalleryProps) {
  const t = useTranslations("gallery");
  const [active, setActive] = useState<number | null>(null);
  const opener = useRef<HTMLElement | null>(null);

  const open = (index: number, element: HTMLElement) => { opener.current = element; setActive(index); };
  const close = useCallback(() => { setActive(null); opener.current?.focus(); }, []);

  if (photos.length === 0) return null;
  const preview = photos.slice(1, 1 + MAX_PREVIEW_THUMBS);
  const hidden = photos.length - 1 - preview.length;

  return (
    <div className="catalog-unit-gallery">
      <button type="button" className="catalog-unit-photo catalog-unit-open" onClick={(event) => open(0, event.currentTarget)} aria-label={t("open", { name, count: photos.length })}>
        <Image src={photos[0]} alt={name} fill sizes="(max-width: 740px) 50vw, 360px" />
        {photos.length > 1 && <span className="catalog-unit-count" aria-hidden="true"><ImageIcon />{photos.length}</span>}
      </button>
      {preview.length > 0 && (
        <div className="catalog-unit-thumbs">
          {preview.map((src, i) => (
            <button type="button" key={src} className="catalog-unit-photo catalog-unit-open" onClick={(event) => open(i + 1, event.currentTarget)} aria-label={t("showPhotoOf", { name, number: i + 2 })}>
              <Image src={src} alt="" fill sizes="120px" />
              {i === preview.length - 1 && hidden > 0 && <span className="catalog-unit-more">+{hidden}</span>}
            </button>
          ))}
        </div>
      )}
      {active !== null && <Lightbox name={name} photos={photos} index={active} onIndex={setActive} onClose={close} />}
    </div>
  );
}
