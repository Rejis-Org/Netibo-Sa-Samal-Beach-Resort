"use client";

import { useEffect, useRef, useState } from "react";

const FADE_SECONDS = 1;
const RESUME_EVENTS = ["touchend", "pointerup", "click", "scroll"] as const;

export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: no-preference)");
    const update = () => setEnabled(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!enabled || !video) return;
    video.muted = true;
    const resume = () => {
      if (video.paused && !document.hidden) video.play().catch(() => {});
    };
    resume();
    RESUME_EVENTS.forEach((name) => window.addEventListener(name, resume, { passive: true }));
    document.addEventListener("visibilitychange", resume);
    video.addEventListener("pause", resume);
    return () => {
      RESUME_EVENTS.forEach((name) => window.removeEventListener(name, resume));
      document.removeEventListener("visibilitychange", resume);
      video.removeEventListener("pause", resume);
    };
  }, [enabled]);

  if (!enabled) return null;

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    setFading(video.duration - video.currentTime <= FADE_SECONDS);
  };

  return (
    <div className={ready && !fading ? "hero-video is-visible" : "hero-video"} data-ready={ready ? "true" : undefined} aria-hidden="true">
      <video
        ref={videoRef}
        poster="/hero-poster.jpg"
        muted
        loop
        autoPlay
        playsInline
        preload="auto"
        tabIndex={-1}
        onPlaying={() => setReady(true)}
        onTimeUpdate={handleTimeUpdate}
      >
        <source src="/bg-ocean-web.mp4" type="video/mp4" />
        <source src="/bg-ocean.mp4" type="video/mp4" />
      </video>
    </div>
  );
}
