-- Cerrar una escritura cruzada entre cuentas a través de las líneas de factura.
--
-- El problema: `invoice_lines` solo comprobaba que la fila fuera tuya
-- (`user_id = auth.uid()`), pero no que la factura a la que apunta lo fuera. Y
-- `recalc_invoice_totals()` corría como `security definer`, así que su `update
-- invoices` se saltaba la RLS. Combinando las dos cosas, insertando una línea
-- propia que apuntara al `invoice_id` de otra persona se le reescribían los
-- importes de su factura.
--
-- No era explotable en la práctica —un solo usuario, registro cerrado y los
-- identificadores son UUID aleatorios— pero es el mismo fallo de fondo que ya
-- tuvo la vista `account_balances` en 0003: un objeto con privilegios elevados
-- operando sobre un identificador que viene de fuera.
--
-- Se arregla por los dos lados a la vez.

-- ---------------------------------------------------------------------
-- 1. El trigger deja de tener privilegios elevados
--
-- Con permisos de invocador el `update` pasa por la RLS: sobre una factura
-- propia funciona exactamente igual que antes, y sobre una ajena afecta a cero
-- filas. `search_path` se mantiene fijo de todos modos.
-- ---------------------------------------------------------------------

create or replace function recalc_invoice_totals()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  target_id uuid := coalesce(new.invoice_id, old.invoice_id);
  base numeric(12, 2);
begin
  select coalesce(sum(quantity * unit_price), 0) into base
  from invoice_lines where invoice_id = target_id;

  update invoices
  set amount = base,
      net_amount = base - (base * irpf_pct / 100) + (base * iva_pct / 100)
  where id = target_id;

  return null;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. La política exige además que la factura padre sea tuya
--
-- Segunda barrera, y de paso impide que queden líneas apuntando a facturas
-- ajenas aunque nunca lleguen a modificarlas.
-- ---------------------------------------------------------------------

drop policy if exists "owner all invoice_lines" on invoice_lines;

create policy "owner all invoice_lines" on invoice_lines for all
  using (
    user_id = auth.uid()
    and exists (
      select 1 from invoices i
      where i.id = invoice_id and i.user_id = auth.uid()
    )
  )
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from invoices i
      where i.id = invoice_id and i.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- Lo que NO se toca, y por qué
--
--   * `handle_new_user()` conserva `security definer`: se dispara sobre
--     `auth.users` sin sesión de usuario y lo necesita para poder sembrar
--     cuentas y categorías.
--
--   * `handle_invoice_paid()` conserva `security definer`: solo se alcanza
--     actualizando una factura propia —la RLS de `invoices` lo garantiza—, así
--     que `new.user_id` siempre es quien ejecuta. Quitárselo no aportaría nada
--     y lo rompería si algún día se marcara una factura como cobrada desde un
--     proceso sin sesión.
-- ---------------------------------------------------------------------
