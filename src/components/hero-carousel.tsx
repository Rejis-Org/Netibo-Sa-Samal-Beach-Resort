"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowLeftIcon, ArrowRightIcon, ArrowUpRightIcon } from "@/components/icons";

type SlideId = "price-list" | "gather" | "island";

const slidePhotos: Partial<Record<SlideId, string>> = {
  gather: "/family.png",
  island: "/samal2.png",
};

const SLIDE_COUNT = 3;
const AUTOPLAY_MS = 6500;

export function HeroCarousel() {
  const t = useTranslations("home");
  const actions = useTranslations("actions");
  const reduceMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStart = useRef<number | null>(null);
  const resumeTimer = useRef<number | null>(null);

  const slides: { id: SlideId; title: string; text: string; action: string; href: string; visualAlt: string }[] = [
    { id: "price-list", title: t("slideOneTitle"), text: t("slideOneText"), action: t("slideOneAction"), href: "/packages", visualAlt: t("slideOneAlt") },
    { id: "gather", title: t("slideTwoTitle"), text: t("slideTwoText"), action: t("slideTwoAction"), href: "/stay", visualAlt: t("slideTwoAlt") },
    { id: "island", title: t("slideThreeTitle"), text: t("slideThreeText"), action: t("slideThreeAction"), href: "/find-us", visualAlt: t("slideThreeAlt") },
  ];

  function goTo(index: number) {
    setActiveIndex((index + SLIDE_COUNT) % SLIDE_COUNT);
  }

  function pauseAfterTouch() {
    setPaused(true);
    if (resumeTimer.current !== null) window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => setPaused(false), 7000);
  }

  // Autoplay. activeIndex is a dependency so every manual change (arrows, dots,
  // swipe) restarts the full delay instead of advancing right after the click.
  useEffect(() => {
    if (paused || reduceMotion) return;
    const timer = window.setInterval(() => {
      // Skip while the tab is in the background so slides don't pile up / desync.
      if (document.hidden) return;
      setActiveIndex((current) => (current + 1) % SLIDE_COUNT);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [paused, reduceMotion, activeIndex]);

  useEffect(() => () => {
    if (resumeTimer.current !== null) window.clearTimeout(resumeTimer.current);
  }, []);

  const slide = slides[activeIndex];
  const photo = slidePhotos[slide.id];

  return (
    <section
      className="showcase page-container"
      aria-label={t("carouselLabel")}
      aria-roledescription={t("carouselRole")}
      // Only a real mouse hover pauses. Touch taps fire emulated mouseenter
      // events that never get a matching mouseleave, which froze the slider.
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setPaused(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") setPaused(false);
      }}
      // Only keyboard focus pauses. Clicking an arrow/dot gives the button focus,
      // which used to pause autoplay until the user clicked somewhere else.
      onFocusCapture={(event) => {
        if (event.target instanceof HTMLElement && event.target.matches(":focus-visible")) setPaused(true);
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
      }}
      onTouchStart={(event) => {
        touchStart.current = event.changedTouches[0]?.clientX ?? null;
        setPaused(true);
      }}
      onTouchEnd={(event) => {
        const end = event.changedTouches[0]?.clientX;
        if (touchStart.current !== null && end !== undefined) {
          const distance = end - touchStart.current;
          if (Math.abs(distance) > 48) goTo(activeIndex + (distance < 0 ? 1 : -1));
        }
        touchStart.current = null;
        pauseAfterTouch();
      }}
      onTouchCancel={() => {
        touchStart.current = null;
        pauseAfterTouch();
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") goTo(activeIndex + 1);
        if (event.key === "ArrowLeft") goTo(activeIndex - 1);
      }}
    >
      <div className="showcase-copy">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={slide.id}
            className="showcase-copy-inner"
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -12 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1>{slide.title}</h1>
            <p className="showcase-description">{slide.text}</p>
            <Link className="button button-blue" href={slide.href}>{slide.action}<ArrowUpRightIcon size={18} /></Link>
          </motion.div>
        </AnimatePresence>
        <div className="carousel-controls" aria-label={t("carouselControls")}>
          <button className="carousel-arrow" type="button" onClick={() => goTo(activeIndex - 1)} aria-label={actions("previousSlide")}><ArrowLeftIcon size={20} /></button>
          <div className="carousel-dots" role="group" aria-label={actions("chooseSlide")}>
            {slides.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={index === activeIndex ? "carousel-dot is-active" : "carousel-dot"}
                aria-label={`${actions("showSlide")} ${index + 1}`}
                aria-current={index === activeIndex ? "true" : undefined}
                onClick={() => goTo(index)}
              />
            ))}
          </div>
          <button className="carousel-arrow" type="button" onClick={() => goTo(activeIndex + 1)} aria-label={actions("nextSlide")}><ArrowRightIcon size={20} /></button>
        </div>
      </div>
      <div className="showcase-visual" role="img" aria-label={slide.visualAlt}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={slide.id}
            className={`showcase-art showcase-art-${slide.id}${photo ? " has-photo" : ""}`}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, scale: 1.01 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            {slide.id === "price-list" ? (
              <Image src="/price-list.png" alt="" fill sizes="(max-width: 760px) 100vw, 48vw" priority />
            ) : photo ? (
              <Image src={photo} alt="" fill sizes="(max-width: 760px) 100vw, 48vw" />
            ) : (
              <>
                <span className="art-sun" aria-hidden="true" />
                <span className="art-wave art-wave-one" aria-hidden="true" />
                <span className="art-wave art-wave-two" aria-hidden="true" />
                <span className="art-palm" aria-hidden="true">⌁</span>
                <span className="art-placeholder-label">{t("photoPlaceholder")}</span>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      {/* Preload the other slide photos up front. Without this each image only
          starts downloading when its slide appears, so the slider sat on a blank
          frame for a long time before continuing. */}
      <div hidden aria-hidden="true">
        {Object.entries(slidePhotos).map(([id, src]) => (
          <Image key={id} src={src} alt="" width={16} height={16} sizes="(max-width: 760px) 100vw, 48vw" loading="eager" />
        ))}
      </div>
    </section>
  );
}
