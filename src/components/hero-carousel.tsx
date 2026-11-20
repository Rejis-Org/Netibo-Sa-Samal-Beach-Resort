"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowLeftIcon, ArrowRightIcon, ArrowUpRightIcon } from "@/components/icons";
import { HeroBookingBar } from "@/components/hero-booking-bar";

type SlideId = "beach-day" | "gather" | "island";

const SLIDE_COUNT = 3;
const AUTOPLAY_MS = 6500;
const HIDDEN_RETRY_MS = 500;

export function HeroCarousel() {
  const t = useTranslations("home");
  const actions = useTranslations("actions");
  const reduceMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const touchStart = useRef<number | null>(null);

  const slides: { id: SlideId; title: string; text: string; action: string; href: string }[] = [
    { id: "beach-day", title: t("slideOneTitle"), text: t("slideOneText"), action: t("slideOneAction"), href: "/packages" },
    { id: "gather", title: t("slideTwoTitle"), text: t("slideTwoText"), action: t("slideTwoAction"), href: "/stay" },
    { id: "island", title: t("slideThreeTitle"), text: t("slideThreeText"), action: t("slideThreeAction"), href: "/find-us" },
  ];

  function goTo(index: number) {
    setActiveIndex((index + SLIDE_COUNT) % SLIDE_COUNT);
  }

  useEffect(() => {
    if (keyboardFocus || reduceMotion) return;
    let timer: number;
    const schedule = (delay: number) => {
      timer = window.setTimeout(() => {
        if (document.hidden) {
          schedule(HIDDEN_RETRY_MS);
          return;
        }
        setActiveIndex((current) => (current + 1) % SLIDE_COUNT);
      }, delay);
    };
    schedule(AUTOPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [keyboardFocus, reduceMotion, activeIndex]);

  const slide = slides[activeIndex];

  return (
    <section
      className="showcase page-container"
      aria-label={t("carouselLabel")}
      aria-roledescription={t("carouselRole")}
      onFocusCapture={(event) => {
        const target = event.target;
        setKeyboardFocus(target instanceof HTMLElement && !(target instanceof HTMLInputElement) && target.matches(":focus-visible"));
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setKeyboardFocus(false);
      }}
      onTouchStart={(event) => {
        touchStart.current = event.changedTouches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const end = event.changedTouches[0]?.clientX;
        if (touchStart.current !== null && end !== undefined) {
          const distance = end - touchStart.current;
          if (Math.abs(distance) > 48) goTo(activeIndex + (distance < 0 ? 1 : -1));
        }
        touchStart.current = null;
      }}
      onTouchCancel={() => {
        touchStart.current = null;
      }}
      onKeyDown={(event) => {
        if (event.target instanceof HTMLInputElement) return;
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
            <div className="showcase-text">
              <h1>{slide.title}</h1>
              <p className="showcase-description">{slide.text}</p>
            </div>
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
        <HeroBookingBar />
      </div>
    </section>
  );
}
