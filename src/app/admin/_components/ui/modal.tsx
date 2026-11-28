"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

type ModalProps = {
  open: boolean;
  title: string;
  /** Called for the close button, Esc and a click on the backdrop. The parent decides whether to actually close. */
  onRequestClose: () => void;
  children: ReactNode;
};

/**
 * Floating dialog built on the native <dialog> element: it sits in the browser's top layer, traps focus,
 * closes on Esc and gives focus back to the button that opened it. The content is only mounted while open,
 * so a form inside starts fresh every time.
 */
export function Modal({ open, title, onRequestClose, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pressedOnBackdrop = useRef(false);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="admin-modal"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onRequestClose();
      }}
      onMouseDown={(event) => {
        pressedOnBackdrop.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        // Only a full click on the backdrop closes it, so selecting text and releasing outside does not.
        if (event.target === event.currentTarget && pressedOnBackdrop.current) onRequestClose();
        pressedOnBackdrop.current = false;
      }}
    >
      {open && (
        <>
          <div className="admin-modal-head">
            <h2 id={titleId}>{title}</h2>
            <button type="button" className="admin-modal-close" aria-label="Close" onClick={onRequestClose}>
              ×
            </button>
          </div>
          {children}
        </>
      )}
    </dialog>
  );
}
