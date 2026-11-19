"use client";

import { PlusIcon } from "@phosphor-icons/react/ssr";
import { useRef, useState } from "react";
import {
  loadMovementFormAction,
  type MovementFormData,
} from "@/app/(app)/movement-actions";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { todayInMadrid } from "@/domain/movements";
import { MovementForm } from "./movement-form";

type Loaded = MovementFormData & { today: string };

// The button of the top bar and the form it opens, available from any page.
// The accounts and the categories are asked when the button is pressed, and
// the form is made again each time, so closing it discards what was typed.
export const NewMovementButton = () => {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const toast = useToast();

  const openForm = async () => {
    setLoaded(null);
    setOpen(true);
    const data = await loadMovementFormAction();
    setLoaded({ ...data, today: todayInMadrid() });
  };

  return (
    <>
      <Button ref={button} variant="primary" onClick={openForm}>
        <PlusIcon size={20} />
        Añadir movimiento
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Añadir movimiento"
        returnFocusTo={button}
      >
        {loaded ? (
          <MovementForm
            accounts={loaded.accounts}
            categories={loaded.categories}
            today={loaded.today}
            onSaved={() => {
              setOpen(false);
              toast("Movimiento añadido con éxito");
            }}
            onCancel={() => setOpen(false)}
          />
        ) : (
          <p className="mt-4 text-small text-text-muted">Cargando…</p>
        )}
      </Modal>
    </>
  );
};
