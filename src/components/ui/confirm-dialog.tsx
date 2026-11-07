"use client";

import { useEffect, useId, useRef } from "react";
import { Button } from "./button";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

// Asks before something that cannot be undone. It is the browser's own modal
// <dialog>: it traps the focus, closes with Escape, makes the page behind
// inert and gives the focus back to the button that opened it. The focus
// starts on "Cancelar" so that pressing Enter by mistake deletes nothing.
export const ConfirmDialog = ({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      cancelRef.current?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      // Every way of cancelling (Escape, "Cancelar", the backdrop) closes the
      // dialog, and this tells the parent once. When the parent already set
      // `open` to false, the effect closed it and there is nothing to tell.
      onClose={() => {
        if (open) onCancel();
      }}
      // A click on the backdrop lands on the dialog element itself.
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
      className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-lg bg-raised p-6 text-text shadow-raised backdrop:bg-scrim"
    >
      <h2 id={titleId} className="text-h2 font-semibold">
        {title}
      </h2>
      <p className="mt-2 text-body text-text-muted">{description}</p>
      <div className="mt-6 flex justify-end gap-3">
        <Button
          ref={cancelRef}
          variant="secondary"
          onClick={() => dialogRef.current?.close()}
        >
          Cancelar
        </Button>
        <Button variant="destructive" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
};
