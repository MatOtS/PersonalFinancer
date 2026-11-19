"use client";

import { Dialog } from "@base-ui/react/dialog";
import { XIcon } from "@phosphor-icons/react/ssr";

type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  // Where the focus goes when it closes: the button that opened it.
  returnFocusTo: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
};

// A modal of `docs/design.md`: `raised`, `lg` radius, the page behind dimmed
// with `scrim`. It closes with Escape, the close button and a click outside,
// traps the focus while open and gives it back to `returnFocusTo`. Built on
// Base UI (ADR-20); the confirmation of a deletion keeps its native <dialog>.
export const Modal = ({
  open,
  onOpenChange,
  title,
  returnFocusTo,
  children,
}: ModalProps) => {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-scrim transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup
          finalFocus={returnFocusTo}
          className="fixed top-1/2 left-1/2 max-h-[calc(100vh-4rem)] w-[min(40rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg bg-raised p-6 text-text shadow-raised transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0"
        >
          <div className="flex items-start justify-between gap-4">
            <Dialog.Title className="text-h2 font-semibold">
              {title}
            </Dialog.Title>
            <Dialog.Close
              aria-label="Cerrar"
              className="grid size-9 shrink-0 place-items-center rounded-md text-text-muted hover:bg-accent-soft hover:text-text"
            >
              <XIcon size={20} />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
