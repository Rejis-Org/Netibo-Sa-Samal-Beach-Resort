"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

type SlideId = "price-list" | "gather" | "island";

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
    setActiveIndex((index + slides.length) % slides.length);
  }

  function pauseAfterTouch() {
    setPaused(true);
    if (resumeTimer.current !== null) window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => setPaused(false), 7000);
  }

  useEffect(() => {
    if (paused || reduceMotion) return;
    const timer = window.setInterval(() => setActiveIndex((current) => (current + 1) % slides.length), 6500);
    return () => window.clearInterval(timer);
  }, [paused, reduceMotion, slides.length]);

  useEffect(() => () => {
    if (resumeTimer.current !== null) window.clearTimeout(resumeTimer.current);
  }, []);

  const slide = slides[activeIndex];

  return (
    <section
      className="showcase page-container"
      aria-label={t("carouselLabel")}
      aria-roledescription={t("carouselRole")}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
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
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") goTo(activeIndex + 1);
        if (event.key === "ArrowLeft") goTo(activeIndex - 1);
      }}
    >
      <div className="showcase-copy">
        <p className="eyebrow"><span className="sun-mark" aria-hidden="true">✳</span>{t("eyebrow")}</p>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={slide.id}
            className="showcase-copy-inner"
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -12 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="slide-count">{String(activeIndex + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}</span>
            <h1>{slide.title}</h1>
            <p className="showcase-description">{slide.text}</p>
            <Link className="button button-blue" href={slide.href}>{slide.action}<span aria-hidden="true">↗</span></Link>
          </motion.div>
        </AnimatePresence>
        <div className="carousel-controls" aria-label={t("carouselControls")}>
          <button className="carousel-arrow" type="button" onClick={() => goTo(activeIndex - 1)} aria-label={actions("previousSlide")}><span aria-hidden="true">←</span></button>
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
          <button className="carousel-arrow" type="button" onClick={() => goTo(activeIndex + 1)} aria-label={actions("nextSlide")}><span aria-hidden="true">→</span></button>
        </div>
      </div>
      <div className="showcase-visual" role="img" aria-label={slide.visualAlt}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={slide.id}
            className={`showcase-art showcase-art-${slide.id}`}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, scale: 1.01 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            {slide.id === "price-list" ? (
              <Image src="/facebook-price-list.webp" alt="" fill sizes="(max-width: 760px) 100vw, 48vw" priority />
            ) : (
              <>
                <span className="art-sun" aria-hidden="true" />
                <span className="art-wave art-wave-one" aria-hidden="true" />
                <span className="art-wave art-wave-two" aria-hidden="true" />
                <span className="art-palm" aria-hidden="true">⌁</span>
                <span className="art-placeholder-label">{t("photoPlaceholder")}</span>
              </>
            )}
            <span className="visual-index">{String(activeIndex + 1).padStart(2, "0")}</span>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
