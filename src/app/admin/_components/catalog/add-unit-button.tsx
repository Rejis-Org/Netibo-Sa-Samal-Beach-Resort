"use client";

import { useRouter } from "next/navigation";
import { startTransition, useActionState, useEffect, useState, type FormEvent } from "react";
import { createUnitAction } from "@/app/admin/_actions/catalog";
import { Modal } from "@/app/admin/_components/ui/modal";
import { UnitFormFields } from "./unit-form-fields";

export function AddUnitButton() {
  const [open, setOpen] = useState(false);
  const [dirty, setDirty] = useState(false);

  function close() {
    setDirty(false);
    setOpen(false);
  }

  function requestClose() {
    if (dirty && !window.confirm("Discard this new cottage or room? What you typed or uploaded will be lost.")) return;
    close();
  }

  return (
    <>
      <button type="button" className="button button-blue button-small" onClick={() => setOpen(true)}>
        + Add cottage or room
      </button>
      <Modal open={open} title="Add cottage or room" onRequestClose={requestClose}>
        <AddUnitForm onDirty={() => setDirty(true)} onCancel={requestClose} onSaved={close} />
      </Modal>
    </>
  );
}

function AddUnitForm({
  onDirty,
  onCancel,
  onSaved,
}: {
  onDirty: () => void;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createUnitAction, null);
  const [photoFolder] = useState(() => `new/${crypto.randomUUID()}`);

  useEffect(() => {
    if (!state?.saved) return;
    onSaved();
    router.replace("/admin/units?saved=unitAdded");
  }, [state, onSaved, router]);

  // The action is called directly (not through the form's action prop) so a failed save keeps what was typed.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  }

  return (
    <form className="admin-form admin-modal-form" onSubmit={handleSubmit} onChange={onDirty}>
      <div className="admin-modal-body">
        {state?.error && <p className="admin-message admin-message-error admin-field-wide">{state.error}</p>}
        <UnitFormFields photoFolder={photoFolder} onPhotosChange={onDirty} />
      </div>
      <div className="admin-modal-foot">
        <button type="button" className="button button-small admin-modal-cancel" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="button button-blue button-small" disabled={pending}>
          {pending ? "Adding…" : "Add to site"}
        </button>
      </div>
    </form>
  );
}
