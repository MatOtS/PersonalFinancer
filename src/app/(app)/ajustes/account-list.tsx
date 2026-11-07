"use client";

import { useActionState, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { Account } from "@/data/accounts";
import { formatCents } from "@/domain/money";
import { deleteAccountAction, type DeleteAccountState } from "./actions";
import { EditAccountForm } from "./edit-account-form";

export const AccountList = ({ accounts }: { accounts: Account[] }) => {
  const [notice, setNotice] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Account | null>(null);
  const deleteForm = useRef<HTMLFormElement>(null);

  const [, deleteAction] = useActionState(
    async (previous: DeleteAccountState, formData: FormData) => {
      const next = await deleteAccountAction(previous, formData);
      setNotice(next.message);
      return next;
    },
    { message: null },
  );

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
                    onClick={() => setToDelete(account)}
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
        title="¿Eliminar la cuenta?"
        description={
          toDelete
            ? `Se eliminará "${toDelete.name}". Esta acción no se puede deshacer.`
            : ""
        }
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
