"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import type { Feature, FeatureCollection, Point, Polygon } from "geojson";

export type ResortMapLabels = {
  mapLabel: string;
  loading: string;
  error: string;
  openInMaps: string;
  zoomIn: string;
  zoomOut: string;
  rotateLeft: string;
  rotateRight: string;
  tilt: string;
  recenter: string;
  orbitStart: string;
  orbitStop: string;
  hint: string;
  pinSubtitle: string;
  windowsHelp: string;
  macHelp: string;
  mobileHelp: string;
};

type Props = {
  lat: number;
  lng: number;
  name: string;
  mapsHref: string;
  labels: ResortMapLabels;
};

// Keyless satellite imagery + open terrain so the resort sits on real relief.
// Attribution for both is shown in the map's attribution control.
const SATELLITE_TILES = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const TERRAIN_TILES = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
const WORKER_URL = "/vendor/maplibre/maplibre-gl-worker.mjs";
const HOME_VIEW = { zoom: 15.6, pitch: 62, bearing: -28 };
const INTRO_VIEW = { zoom: 12.4, pitch: 0, bearing: 0 };
// The pin is drawn as real 3D geometry, sized in screen pixels so it stays readable at any zoom.
const PIN = { height: 62, bulbCenter: 44, bulbRadius: 17 };
const PIN_DARK = [10, 88, 81];
const PIN_LIGHT = [32, 170, 158];

function mixColor(t: number) {
  return `rgb(${PIN_DARK.map((value, index) => Math.round(value + (PIN_LIGHT[index] - value) * t)).join(",")})`;
}

function ring(lng: number, lat: number, radiusMeters: number, sides: number): [number, number][] {
  const metersPerLng = 111320 * Math.cos((lat * Math.PI) / 180);
  const points: [number, number][] = [];
  for (let index = 0; index < sides; index += 1) {
    const angle = (index / sides) * Math.PI * 2;
    points.push([lng + (Math.cos(angle) * radiusMeters) / metersPerLng, lat + (Math.sin(angle) * radiusMeters) / 110574]);
  }
  points.push(points[0]);
  return points;
}

function pinData(lng: number, lat: number, zoom: number): FeatureCollection<Polygon> {
  const metersPerPixel = (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom;
  const { height, bulbCenter, bulbRadius } = PIN;
  const coneTop = bulbCenter - bulbRadius * 0.45;
  const coneRadius = Math.sqrt(bulbRadius ** 2 - (bulbRadius * 0.45) ** 2);
  const radiusAt = (z: number) => {
    if (z < coneTop) return coneRadius * (z / coneTop);
    const offset = z - bulbCenter;
    return Math.sqrt(Math.max(0, bulbRadius ** 2 - offset ** 2));
  };
  const slices = 24;
  const features: Feature<Polygon>[] = [];
  for (let index = 0; index < slices; index += 1) {
    const bottom = (index / slices) * height;
    const top = ((index + 1) / slices) * height;
    const middle = (bottom + top) / 2;
    const radius = Math.max(radiusAt(middle), 0.5) * metersPerPixel;
    features.push({
      type: "Feature",
      properties: {
        base: bottom * metersPerPixel,
        top: top * metersPerPixel,
        color: middle > bulbCenter + bulbRadius * 0.62 ? "#fffdf7" : mixColor(middle / height),
      },
      geometry: { type: "Polygon", coordinates: [ring(lng, lat, radius, 28)] },
    });
  }
  return { type: "FeatureCollection", features };
}

function pointData(lng: number, lat: number): FeatureCollection<Point> {
  return { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [lng, lat] } }] };
}

function labelOffset(pitchDegrees: number): [number, number] {
  const pitch = (pitchDegrees * Math.PI) / 180;
  return [0, -(PIN.height * Math.sin(pitch) + PIN.bulbRadius * Math.cos(pitch) * 0.9 + 8)];
}

const iconProps = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

function MapButton({ label, onClick, pressed, children }: { label: string; onClick: () => void; pressed?: boolean; children: ReactNode }) {
  return (
    <button type="button" className="resort-map-button" aria-label={label} title={label} aria-pressed={pressed} onClick={onClick}>
      {children}
    </button>
  );
}

export function ResortMap({ lat, lng, name, mapsHref, labels }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const orbitRef = useRef(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [orbiting, setOrbiting] = useState(false);
  const [hintVisible, setHintVisible] = useState(true);

  const stopOrbit = useCallback(() => {
    orbitRef.current = false;
    setOrbiting(false);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let disposed = false;
    let frame = 0;
    let visible = true;
    let map: MapLibreMap | null = null;
    let starter: IntersectionObserver | null = null;
    let watcher: IntersectionObserver | null = null;

    const start = async () => {
      try {
        const maplibre = await import("maplibre-gl");
        if (disposed) return;
        // MapLibre v6 runs its tile worker from a separate file that Turbopack doesn't emit,
        // so it is served from /public/vendor/maplibre (keep it in sync with the installed version).
        maplibre.setWorkerUrl(WORKER_URL);
        const first = reducedMotion ? HOME_VIEW : INTRO_VIEW;
        const instance = new maplibre.Map({
          container,
          center: [lng, lat],
          zoom: first.zoom,
          pitch: first.pitch,
          bearing: first.bearing,
          minZoom: 10,
          maxZoom: 18.2,
          maxPitch: 75,
          cooperativeGestures: true,
          attributionControl: false,
          locale: {
            "CooperativeGesturesHandler.WindowsHelpText": labels.windowsHelp,
            "CooperativeGesturesHandler.MacHelpText": labels.macHelp,
            "CooperativeGesturesHandler.MobileHelpText": labels.mobileHelp,
          },
          style: {
            version: 8,
            sources: {
              satellite: {
                type: "raster",
                tiles: [SATELLITE_TILES],
                tileSize: 256,
                maxzoom: 18,
                attribution: "Imagery © Esri, Maxar, Earthstar Geographics",
              },
              terrain: {
                type: "raster-dem",
                tiles: [TERRAIN_TILES],
                tileSize: 256,
                maxzoom: 15,
                encoding: "terrarium",
                attribution: "Terrain: Mapzen, AWS Open Data",
              },
            },
            layers: [
              { id: "ground", type: "background", paint: { "background-color": "#cfe6e1" } },
              { id: "satellite", type: "raster", source: "satellite", paint: { "raster-saturation": 0.12, "raster-fade-duration": 200 } },
            ],
            terrain: { source: "terrain", exaggeration: 1.3 },
            sky: {
              "sky-color": "#a9d8ea",
              "horizon-color": "#f4ecd8",
              "fog-color": "#e6f2ef",
              "sky-horizon-blend": 0.5,
              "horizon-fog-blend": 0.5,
              "fog-ground-blend": 0.35,
            },
          },
        });
        map = instance;
        mapRef.current = instance;
        instance.addControl(new maplibre.AttributionControl({ compact: true }), "bottom-left");

        const label = document.createElement("div");
        label.className = "resort-pin-label";
        const title = document.createElement("strong");
        title.textContent = name;
        const subtitle = document.createElement("span");
        subtitle.textContent = labels.pinSubtitle;
        label.append(title, subtitle);
        const marker = new maplibre.Marker({ element: label, anchor: "bottom", offset: labelOffset(instance.getPitch()) })
          .setLngLat([lng, lat])
          .addTo(instance);

        let pinPending = false;
        const refreshPin = () => {
          if (pinPending) return;
          pinPending = true;
          requestAnimationFrame(() => {
            pinPending = false;
            const source = instance.getSource("pin") as GeoJSONSource | undefined;
            source?.setData(pinData(lng, lat, instance.getZoom()));
          });
        };

        instance.on("load", () => {
          instance.addSource("halo", { type: "geojson", data: pointData(lng, lat) });
          instance.addLayer({
            id: "halo",
            type: "circle",
            source: "halo",
            paint: { "circle-radius": 18, "circle-color": "#fbab15", "circle-opacity": 0.4, "circle-blur": 0.7, "circle-pitch-alignment": "map", "circle-pitch-scale": "map" },
          });
          instance.addSource("pin", { type: "geojson", data: pinData(lng, lat, instance.getZoom()) });
          instance.addLayer({
            id: "pin",
            type: "fill-extrusion",
            source: "pin",
            paint: {
              "fill-extrusion-color": ["get", "color"],
              "fill-extrusion-base": ["get", "base"],
              "fill-extrusion-height": ["get", "top"],
              "fill-extrusion-opacity": 1,
              "fill-extrusion-vertical-gradient": true,
            },
          });
          setStatus("ready");
          if (reducedMotion) return;
          instance.once("moveend", () => {
            orbitRef.current = true;
            setOrbiting(true);
          });
          instance.flyTo({ center: [lng, lat], zoom: HOME_VIEW.zoom, pitch: HOME_VIEW.pitch, bearing: HOME_VIEW.bearing, duration: 4200, curve: 1.5, essential: false });
        });

        instance.on("zoom", refreshPin);
        instance.on("pitch", () => marker.setOffset(labelOffset(instance.getPitch())));
        const interact = () => {
          stopOrbit();
          setHintVisible(false);
        };
        instance.on("mousedown", interact);
        instance.on("touchstart", interact);

        watcher = new IntersectionObserver(([entry]) => {
          visible = entry.isIntersecting;
        });
        watcher.observe(container);

        let last = performance.now();
        const tick = (now: number) => {
          frame = requestAnimationFrame(tick);
          const elapsed = Math.min(now - last, 64);
          last = now;
          if (!visible || document.hidden) return;
          if (orbitRef.current) instance.setBearing(instance.getBearing() + elapsed * 0.0045);
          if (!reducedMotion && instance.getLayer("halo")) {
            const phase = (now % 2400) / 2400;
            instance.setPaintProperty("halo", "circle-radius", 16 + phase * 30);
            instance.setPaintProperty("halo", "circle-opacity", 0.5 * (1 - phase));
          }
        };
        frame = requestAnimationFrame(tick);
      } catch {
        if (!disposed) setStatus("error");
      }
    };

    starter = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        starter?.disconnect();
        void start();
      },
      { rootMargin: "300px" },
    );
    starter.observe(container);

    return () => {
      disposed = true;
      starter?.disconnect();
      watcher?.disconnect();
      cancelAnimationFrame(frame);
      map?.remove();
      mapRef.current = null;
    };
  }, [lat, lng, name, labels, stopOrbit]);

  const turn = (degrees: number) => {
    stopOrbit();
    const map = mapRef.current;
    if (map) map.easeTo({ bearing: map.getBearing() + degrees, duration: 700 });
  };
  const toggleTilt = () => {
    stopOrbit();
    const map = mapRef.current;
    if (map) map.easeTo({ pitch: map.getPitch() > 10 ? 0 : HOME_VIEW.pitch, duration: 800 });
  };
  const recenter = () => {
    stopOrbit();
    mapRef.current?.flyTo({ center: [lng, lat], zoom: HOME_VIEW.zoom, pitch: HOME_VIEW.pitch, bearing: HOME_VIEW.bearing, duration: 1600 });
  };
  const toggleOrbit = () => {
    if (orbitRef.current) {
      stopOrbit();
      return;
    }
    orbitRef.current = true;
    setOrbiting(true);
  };

  return (
    <div className="resort-map" role="region" aria-label={labels.mapLabel}>
      <div ref={containerRef} className="resort-map-canvas" />
      <div className={status === "ready" ? "resort-map-status is-hidden" : "resort-map-status"} aria-live="polite">
        {status === "error" ? (
          <>
            <p>{labels.error}</p>
            <a className="text-link" href={mapsHref} target="_blank" rel="noreferrer">{labels.openInMaps}</a>
          </>
        ) : (
          <p>{labels.loading}</p>
        )}
      </div>
      {status === "ready" && (
        <>
          <div className="resort-map-controls resort-map-controls-top">
            <MapButton label={labels.zoomIn} onClick={() => mapRef.current?.zoomIn()}>
              <svg {...iconProps}><path d="M12 5v14M5 12h14" /></svg>
            </MapButton>
            <MapButton label={labels.zoomOut} onClick={() => mapRef.current?.zoomOut()}>
              <svg {...iconProps}><path d="M5 12h14" /></svg>
            </MapButton>
          </div>
          <div className="resort-map-controls resort-map-controls-bottom">
            <MapButton label={labels.rotateLeft} onClick={() => turn(-45)}>
              <svg {...iconProps}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
            </MapButton>
            <MapButton label={labels.rotateRight} onClick={() => turn(45)}>
              <svg {...iconProps}><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /></svg>
            </MapButton>
            <MapButton label={labels.tilt} onClick={toggleTilt}>
              <svg {...iconProps}><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></svg>
            </MapButton>
            <MapButton label={labels.recenter} onClick={recenter}>
              <svg {...iconProps}><circle cx="12" cy="12" r="3" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /></svg>
            </MapButton>
            <MapButton label={orbiting ? labels.orbitStop : labels.orbitStart} onClick={toggleOrbit} pressed={orbiting}>
              {orbiting ? (
                <svg {...iconProps}><rect x="14" y="4" width="4" height="16" rx="1" /><rect x="6" y="4" width="4" height="16" rx="1" /></svg>
              ) : (
                <svg {...iconProps}><polygon points="6 3 20 12 6 21 6 3" /></svg>
              )}
            </MapButton>
          </div>
          <p className={hintVisible ? "resort-map-hint" : "resort-map-hint is-hidden"}>{labels.hint}</p>
        </>
      )}
    </div>
  );
}
