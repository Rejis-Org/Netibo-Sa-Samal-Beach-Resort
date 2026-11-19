"use client";

import { useEffect, useRef, useState } from "react";

const FADE_SECONDS = 1;

export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 741px) and (prefers-reduced-motion: no-preference)");
    const update = () => setEnabled(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  if (!enabled) return null;

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    setFading(video.duration - video.currentTime <= FADE_SECONDS);
  };

  const handleEnded = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    void video.play();
  };

  return (
    <div className={ready && !fading ? "hero-video is-visible" : "hero-video"} aria-hidden="true">
      <video
        ref={videoRef}
        src="/bg-ocean.mp4"
        muted
        autoPlay
        playsInline
        preload="auto"
        tabIndex={-1}
        onCanPlay={() => setReady(true)}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
      />
    </div>
  );
}
