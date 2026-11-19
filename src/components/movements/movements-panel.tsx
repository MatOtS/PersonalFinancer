"use client";

import { useRef, useState } from "react";
import {
  deleteMovementsAction,
  patchMovementsAction,
  updateMovementAction,
} from "@/app/(app)/movement-actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Modal } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import type { Account } from "@/data/accounts";
import type { CategoryGroups } from "@/data/categories";
import type { MovementRecord } from "@/data/movements";
import { formatCents } from "@/domain/money";
import { BulkEditBar } from "./bulk-edit-bar";
import { MovementForm } from "./movement-form";
import { MovementsTable, type MovementTableRow } from "./movements-table";

type Props = {
  movements: MovementRecord[];
  accounts: Account[];
  categories: CategoryGroups;
  today: string;
  title: string;
  emptyText: string;
};

type Confirm = { ids: string[]; description: string };

const asRow = (movement: MovementRecord): MovementTableRow => ({
  key: movement.id,
  date: movement.date,
  description: movement.description,
  amountCents: movement.amountCents,
  kind: movement.kind,
  accountId: movement.accountId,
  categoryId: movement.categoryId,
  subcategoryId: movement.subcategoryId,
  workKind: movement.workKind,
  isFixed: movement.isFixed,
});

// The movements of the period with what the user can do to them: edit one,
// delete one, and edit or delete several at once (the boxes at the left).
export const MovementsPanel = ({
  movements,
  accounts,
  categories,
  today,
  title,
  emptyText,
}: Props) => {
  const toast = useToast();
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [editing, setEditing] = useState<MovementRecord | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const opener = useRef<HTMLElement | null>(null);

  // Only the movements that are still in the list can be selected.
  const ids = movements.filter((m) => selected.has(m.id)).map((m) => m.id);

  const askDelete = (idsToDelete: string[], description: string) =>
    setConfirm({ ids: idsToDelete, description });

  return (
    <section
      aria-label={title}
      className="rounded-lg border border-border bg-surface p-6 shadow-card"
    >
      <h2 className="text-h2 font-semibold">{title}</h2>
      <p className="mt-1 text-small text-text-muted">
        {movements.length}{" "}
        {movements.length === 1 ? "movimiento" : "movimientos"}
      </p>

      {movements.length > 0 && (
        <div className="mt-4">
          <BulkEditBar
            count={ids.length}
            accounts={accounts}
            categories={categories}
            onApply={async (_patch, input) => {
              const message = await patchMovementsAction(ids, input);
              if (!message) {
                setSelected(new Set());
                toast("Movimientos actualizados con éxito");
              }
              return message;
            }}
            onDelete={() =>
              askDelete(
                ids,
                `Se ${ids.length === 1 ? "eliminará 1 movimiento" : `eliminarán ${ids.length} movimientos`}.`,
              )
            }
          />
        </div>
      )}

      <div className="mt-4">
        <MovementsTable
          rows={movements.map(asRow)}
          accounts={accounts}
          categories={categories}
          selected={selected}
          onSelectedChange={setSelected}
          caption={title}
          emptyText={emptyText}
          renderActions={(row) => {
            const movement = movements.find((m) => m.id === row.key);
            if (!movement) return null;
            const label =
              movement.description ?? formatCents(movement.amountCents);
            return (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  aria-label={`Editar ${label}`}
                  onClick={(event) => {
                    opener.current = event.currentTarget;
                    setEditing(movement);
                  }}
                >
                  Editar
                </Button>
                <Button
                  variant="ghost-destructive"
                  aria-label={`Eliminar ${label}`}
                  onClick={() =>
                    askDelete(
                      [movement.id],
                      `Se eliminará el movimiento "${label}".`,
                    )
                  }
                >
                  Eliminar
                </Button>
              </div>
            );
          }}
        />
      </div>

      <Modal
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        title="Editar movimiento"
        returnFocusTo={opener}
      >
        {editing && (
          <MovementForm
            accounts={accounts}
            categories={categories}
            today={today}
            edit={{
              id: editing.id,
              action: updateMovementAction,
              initial: {
                kind: editing.kind,
                amount: formatCents(editing.amountCents).replace(/ €$/, ""),
                date: editing.date,
                accountId: editing.accountId,
                workKind: editing.workKind,
                description: editing.description ?? "",
                categoryId: editing.categoryId ?? "",
                subcategoryId: editing.subcategoryId ?? "",
                isFixed: editing.isFixed,
              },
            }}
            onSaved={() => {
              setEditing(null);
              setSelected(new Set());
              toast("Movimiento actualizado con éxito");
            }}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={confirm !== null}
        title="¿Eliminar los movimientos?"
        description={`${confirm?.description ?? ""} Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={async () => {
          const toDelete = confirm?.ids ?? [];
          setConfirm(null);
          await deleteMovementsAction(toDelete);
          setSelected(new Set());
          toast("Movimientos eliminados");
        }}
        onCancel={() => setConfirm(null)}
      />
    </section>
  );
};
