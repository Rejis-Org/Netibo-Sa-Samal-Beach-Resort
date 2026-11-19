"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";

type PriceListLightboxProps = { src: string; alt: string; title: string; width: number; height: number };

export function PriceListLightbox({ src, alt, title, width, height }: PriceListLightboxProps) {
  const t = useTranslations("gallery");
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => { setOpen(false); opener.current?.focus(); }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); close(); }
      if (event.key === "Tab") { event.preventDefault(); closeRef.current?.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, close]);

  return (
    <>
      <button type="button" className="ad-strip-image" onClick={() => setOpen(true)} ref={opener} aria-label={title}>
        <Image src={src} alt={alt} width={width} height={height} sizes="(max-width: 640px) 45vw, 260px" />
      </button>
      {open && createPortal(
        <div className="unit-lightbox" role="dialog" aria-modal="true" aria-label={title}>
          <div className="unit-lightbox-bar">
            <div className="unit-lightbox-title"><strong>{title}</strong></div>
            <button type="button" className="unit-lightbox-close" onClick={close} ref={closeRef} aria-label={t("close")}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </div>
          <div className="unit-lightbox-stage">
            <Image className="unit-lightbox-image" src={src} alt={alt} fill sizes="100vw" priority />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
