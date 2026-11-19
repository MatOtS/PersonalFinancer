"use client";

import { Toast } from "@base-ui/react/toast";
import { XIcon } from "@phosphor-icons/react/ssr";

// The result of an action (`docs/design.md`): bottom right on desktop, 3
// seconds, and it waits while the pointer or the focus is on it. Built on Base
// UI (ADR-20). Put it once around the pages; anything inside can call
// `useToast`.
export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <Toast.Provider timeout={3000} limit={3}>
      {children}
      <Toast.Portal>
        <Toast.Viewport className="fixed right-4 bottom-4 z-50 flex w-80 flex-col gap-2">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
};

function ToastList() {
  const { toasts } = Toast.useToastManager();
  return toasts.map((toast) => (
    <Toast.Root
      key={toast.id}
      toast={toast}
      className="rounded-md border border-positive bg-positive p-4 text-on-accent shadow-raised transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0"
    >
      <Toast.Content className="flex items-start justify-between gap-3">
        <Toast.Title className="text-body font-semibold" />
        <Toast.Close
          aria-label="Cerrar"
          className="grid size-6 shrink-0 place-items-center rounded-sm text-on-accent opacity-80 hover:opacity-100"
        >
          <XIcon size={16} />
        </Toast.Close>
      </Toast.Content>
    </Toast.Root>
  ));
}

// Shows a message as a toast.
export function useToast() {
  const manager = Toast.useToastManager();
  return (message: string) => manager.add({ title: message, type: "success" });
}
