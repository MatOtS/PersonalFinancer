"use client";

import { useActionState, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { Account } from "@/data/accounts";
import { formatCents } from "@/domain/money";
import {
  countMovementsAction,
  deleteAccountAction,
  type DeleteAccountState,
} from "./actions";
import { EditAccountForm } from "./edit-account-form";

type ToDelete = { id: string; name: string; movements: number };

const CANNOT_UNDO = "Esta acción no se puede deshacer.";

// An account with movements takes them with it, so the confirmation says how
// many; without movements it keeps the text it had.
export const deleteAccountText = (name: string, movements: number) => {
  const withMovements =
    movements === 0
      ? `"${name}"`
      : `la cuenta "${name}" que contiene ${movements} ${movements === 1 ? "movimiento" : "movimientos"}`;
  return {
    title: "¿Eliminar la cuenta?",
    description: `Se eliminará ${withMovements}. ${CANNOT_UNDO}`,
  };
};

export const AccountList = ({ accounts }: { accounts: Account[] }) => {
  const [notice, setNotice] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<ToDelete | null>(null);
  const deleteForm = useRef<HTMLFormElement>(null);

  const [, deleteAction] = useActionState(
    async (previous: DeleteAccountState, formData: FormData) => {
      const next = await deleteAccountAction(previous, formData);
      setNotice(next.message);
      return next;
    },
    { message: null },
  );

  // The number is asked now, not read from the page: another tab may have
  // added movements.
  const askToDelete = async (account: Account) => {
    setNotice(null);
    const movements = await countMovementsAction(account.id);
    setToDelete({ id: account.id, name: account.name, movements });
  };

  const text = toDelete
    ? deleteAccountText(toDelete.name, toDelete.movements)
    : { title: "", description: "" };

  return (
    <div className="mt-6">
      {/* Always in the page, so a screen reader announces what appears in it. */}
      <p role="alert" className="mb-2 min-h-5 text-small text-negative">
        {notice}
      </p>

      {accounts.length === 0 ? (
        <p className="text-small text-text-muted">Aún no tienes cuentas.</p>
      ) : (
        <ul>
          {accounts.map((account) => (
            <li
              key={account.id}
              className="border-b border-border py-3 last:border-b-0"
            >
              {editingId === account.id ? (
                <EditAccountForm
                  account={account}
                  onDone={() => setEditingId(null)}
                  onNotice={setNotice}
                />
              ) : (
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{account.name}</span>
                  <span className="ml-auto tabular-nums">
                    {formatCents(account.openingBalanceCents)}
                  </span>
                  <Button
                    variant="ghost"
                    aria-label={`Editar ${account.name}`}
                    onClick={() => {
                      setNotice(null);
                      setEditingId(account.id);
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="ghost-destructive"
                    aria-label={`Eliminar ${account.name}`}
                    onClick={() => askToDelete(account)}
                  >
                    Eliminar
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <form ref={deleteForm} action={deleteAction}>
        <input type="hidden" name="id" value={toDelete?.id ?? ""} />
      </form>
      <ConfirmDialog
        open={toDelete !== null}
        title={text.title}
        description={text.description}
        confirmLabel="Eliminar"
        onConfirm={() => {
          // The form reads the hidden id when it is submitted; the state change
          // below is only applied after this handler ends.
          deleteForm.current?.requestSubmit();
          setToDelete(null);
        }}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
};
