import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";

type Position = { x: number; y: number };
type DragState = { pointerId: number; startX: number; startY: number; offsetX: number; offsetY: number; moved: boolean };

const storageKey = "netibo-chat-position";

function clampPosition(position: Position): Position {
  const margin = 12;
  const buttonSize = 62;
  return {
    x: Math.max(margin, Math.min(position.x, window.innerWidth - buttonSize - margin)),
    y: Math.max(margin, Math.min(position.y, window.innerHeight - buttonSize - margin)),
  };
}

export function useDraggable() {
  const [position, setPosition] = useState<Position | null>(null);
  const drag = useRef<DragState | null>(null);
  const suppressClick = useRef(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const saved = window.localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved) as Position;
          if (Number.isFinite(parsed.x) && Number.isFinite(parsed.y)) setPosition(clampPosition(parsed));
        }
      } catch {
        setPosition(null);
      }
    });
    const handleResize = () => setPosition((current) => current ? clampPosition(current) : current);
    window.addEventListener("resize", handleResize);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const savePosition = useCallback((next: Position) => {
    const bounded = clampPosition(next);
    setPosition(bounded);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(bounded));
    } catch {
      return;
    }
  }, []);

  function onPointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const current = position ?? { x: rect.left, y: rect.top };
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - current.x,
      offsetY: event.clientY - current.y,
      moved: false,
    };
    suppressClick.current = false;
  }

  function onPointerMove(event: PointerEvent<HTMLButtonElement>) {
    const activeDrag = drag.current;
    if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;
    const next = { x: event.clientX - activeDrag.offsetX, y: event.clientY - activeDrag.offsetY };
    if (Math.abs(event.clientX - activeDrag.startX) > 4 || Math.abs(event.clientY - activeDrag.startY) > 4) activeDrag.moved = true;
    if (activeDrag.moved) setPosition(clampPosition(next));
  }

  function onPointerUp(event: PointerEvent<HTMLButtonElement>) {
    const activeDrag = drag.current;
    if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;
    if (activeDrag.moved) {
      suppressClick.current = true;
      savePosition({ x: event.clientX - activeDrag.offsetX, y: event.clientY - activeDrag.offsetY });
    }
    drag.current = null;
  }

  function consumeSuppressedClick() {
    if (!suppressClick.current) return false;
    suppressClick.current = false;
    return true;
  }

  const panelStyle = position ? (() => {
    const panelWidth = Math.min(390, window.innerWidth - 24);
    const panelHeight = Math.min(610, window.innerHeight - 24);
    const left = Math.max(12, Math.min(position.x + 31 - panelWidth / 2, window.innerWidth - panelWidth - 12));
    const aboveTop = position.y - panelHeight - 12;
    const top = aboveTop >= 12 ? aboveTop : position.y + 74;
    const boundedTop = Math.max(12, Math.min(top, window.innerHeight - panelHeight - 12));
    return { left, top: boundedTop, right: "auto", bottom: "auto" };
  })() : undefined;

  return {
    position,
    panelStyle,
    consumeSuppressedClick,
    pointerHandlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
  };
}
