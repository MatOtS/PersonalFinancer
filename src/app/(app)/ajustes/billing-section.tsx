"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import type { Settings } from "@/data/invoices";
import { percentText } from "@/domain/invoices";
import {
  saveBillingAction,
  saveIssuerAction,
  uploadLogoAction,
  type BillingFormState,
  type IssuerFormState,
} from "./billing-actions";

const SAVED = "Guardado";

const IssuerForm = ({ issuer }: { issuer: Settings["issuer"] }) => {
  const [state, formAction, pending] = useActionState(saveIssuerAction, {
    values: {
      name: issuer.name ?? "",
      taxId: issuer.taxId ?? "",
      phone: issuer.phone ?? "",
      address: issuer.address ?? "",
      email: issuer.email ?? "",
      iban: issuer.iban ?? "",
    },
    errors: {},
    saved: false,
  } satisfies IssuerFormState);

  return (
    <form
      action={formAction}
      aria-label="Tus datos de facturación"
      className="mt-4 grid items-start gap-3 sm:grid-cols-2"
    >
      <div className="sm:col-span-2">
        <TextField
          label="Nombre o razón social"
          name="name"
          autoComplete="off"
          defaultValue={state.values.name}
          error={state.errors.name}
        />
      </div>
      <TextField
        label="NIF"
        name="taxId"
        autoComplete="off"
        defaultValue={state.values.taxId}
        error={state.errors.taxId}
      />
      <TextField
        label="Teléfono"
        name="phone"
        autoComplete="off"
        defaultValue={state.values.phone}
        error={state.errors.phone}
      />
      <div className="sm:col-span-2">
        <TextField
          label="Dirección"
          name="address"
          autoComplete="off"
          defaultValue={state.values.address}
          error={state.errors.address}
        />
      </div>
      <TextField
        label="Email"
        name="email"
        type="email"
        autoComplete="off"
        defaultValue={state.values.email}
        error={state.errors.email}
      />
      <TextField
        label="IBAN"
        name="iban"
        autoComplete="off"
        defaultValue={state.values.iban}
        error={state.errors.iban}
      />
      <div className="flex items-center gap-3 sm:col-span-2">
        <Button type="submit" variant="primary" disabled={pending}>
          Guardar datos de facturación
        </Button>
        <p role="status" className="text-small text-text-muted">
          {state.saved ? SAVED : ""}
        </p>
      </div>
    </form>
  );
};

const LogoForm = ({ hasLogo }: { hasLogo: boolean }) => {
  const [state, formAction, pending] = useActionState(uploadLogoAction, {
    error: null,
    saved: false,
  });
  return (
    <form
      action={formAction}
      aria-label="Logo"
      className="mt-4 flex flex-wrap items-end gap-3"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="logo" className="text-small font-semibold">
          Logo (png o jpg, máximo 512 KB)
        </label>
        <input
          id="logo"
          type="file"
          name="logo"
          accept="image/png,image/jpeg"
        />
        {state.error && (
          <p role="alert" className="text-small text-negative">
            {state.error}
          </p>
        )}
      </div>
      <Button type="submit" variant="secondary" disabled={pending}>
        Subir logo
      </Button>
      <p role="status" className="pb-2 text-small text-text-muted">
        {state.saved
          ? "Logo guardado"
          : hasLogo
            ? "Hay un logo guardado"
            : "Sin logo"}
      </p>
    </form>
  );
};

const BillingForm = ({ billing }: { billing: Settings["billing"] }) => {
  const [state, formAction, pending] = useActionState(saveBillingAction, {
    values: {
      irpf: percentText(billing.irpfBp),
      iva: percentText(billing.ivaBp),
      numberFormat: billing.numberFormat,
      numberNext: String(billing.numberNext),
      dueDays: String(billing.dueDays),
    },
    errors: {},
    saved: false,
  } satisfies BillingFormState);

  return (
    <form
      action={formAction}
      aria-label="Facturación"
      className="mt-4 grid items-start gap-3 sm:grid-cols-2"
    >
      <TextField
        label="IRPF por defecto (%)"
        name="irpf"
        inputMode="decimal"
        autoComplete="off"
        alignRight
        defaultValue={state.values.irpf}
        error={state.errors.irpf}
      />
      <TextField
        label="IVA por defecto (%)"
        name="iva"
        inputMode="decimal"
        autoComplete="off"
        alignRight
        defaultValue={state.values.iva}
        error={state.errors.iva}
      />
      <TextField
        label="Formato del número (YYYY y NNN)"
        name="numberFormat"
        autoComplete="off"
        defaultValue={state.values.numberFormat}
        error={state.errors.numberFormat}
      />
      <TextField
        label="Siguiente número"
        name="numberNext"
        inputMode="numeric"
        autoComplete="off"
        alignRight
        defaultValue={state.values.numberNext}
        error={state.errors.numberNext}
      />
      <TextField
        label="Días hasta el vencimiento"
        name="dueDays"
        inputMode="numeric"
        autoComplete="off"
        alignRight
        defaultValue={state.values.dueDays}
        error={state.errors.dueDays}
      />
      <div className="flex items-end gap-3">
        <Button type="submit" variant="primary" disabled={pending}>
          Guardar facturación
        </Button>
        <p role="status" className="pb-2 text-small text-text-muted">
          {state.saved ? SAVED : ""}
        </p>
      </div>
    </form>
  );
};

export const BillingSection = ({
  settings,
  hasLogo,
}: {
  settings: Settings;
  hasLogo: boolean;
}) => {
  return (
    <>
      <section
        id="datos-facturacion"
        aria-labelledby="datos-facturacion-title"
        className="mt-6 rounded-lg border border-border bg-surface p-6 shadow-card"
      >
        <h2 id="datos-facturacion-title" className="text-h2 font-semibold">
          Tus datos de facturación
        </h2>
        <p className="mt-1 text-small text-text-muted">
          Aparecen como emisor en cada factura que generes.
        </p>
        <IssuerForm issuer={settings.issuer} />
        <LogoForm hasLogo={hasLogo} />
      </section>
      <section
        id="facturacion"
        aria-labelledby="facturacion-title"
        className="mt-6 rounded-lg border border-border bg-surface p-6 shadow-card"
      >
        <h2 id="facturacion-title" className="text-h2 font-semibold">
          Facturación
        </h2>
        <BillingForm billing={settings.billing} />
      </section>
    </>
  );
};
