-- Invoice lines, a three-state lifecycle, and a due date.
--
-- Two things forced this shape:
--   * an invoice held a single `amount` with no concept, so the PDF had nothing
--     to describe;
--   * state was two booleans (`issued`, `paid`) and every invoice was created
--     with issued = true, so "Pendiente" (a draft not yet sent) could not be
--     represented at all.

-- ---------------------------------------------------------------------
-- 1. Lines
-- ---------------------------------------------------------------------

create table if not exists invoice_lines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  position int not null default 0,
  description text not null,
  quantity numeric(12, 2) not null default 1,
  unit_price numeric(12, 2) not null default 0
);

create index if not exists invoice_lines_invoice_idx on invoice_lines (invoice_id, position);

alter table invoice_lines enable row level security;

drop policy if exists "owner all invoice_lines" on invoice_lines;
create policy "owner all invoice_lines" on invoice_lines for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 2. Status and due date
-- ---------------------------------------------------------------------

alter table invoices add column if not exists status text;
alter table invoices add column if not exists due_date date;

-- Map the old booleans onto the three states before making status required.
update invoices
set status = case
  when paid then 'paid'
  when issued then 'issued'
  else 'draft'
end
where status is null;

alter table invoices alter column status set default 'draft';
alter table invoices alter column status set not null;

alter table invoices drop constraint if exists invoices_status_check;
alter table invoices
  add constraint invoices_status_check check (status in ('draft', 'issued', 'paid'));

-- A draft has no number yet: the correlative is assigned when it is issued, so
-- that discarding a draft cannot leave a hole in the series. The existing
-- unique (user_id, invoice_number) still holds — Postgres does not treat NULLs
-- as conflicting.
alter table invoices alter column invoice_number drop not null;

-- The old booleans stay as derived columns so anyone reading the table
-- directly (or a query we missed) still sees the truth. `status` is the only
-- thing the app writes.
create or replace function sync_invoice_flags()
returns trigger
language plpgsql
as $$
begin
  new.issued := new.status in ('issued', 'paid');
  new.paid := new.status = 'paid';
  return new;
end;
$$;

drop trigger if exists on_invoice_status_sync on invoices;
create trigger on_invoice_status_sync
  before insert or update on invoices
  for each row execute function sync_invoice_flags();

-- ---------------------------------------------------------------------
-- 3. Totals follow the lines
--
-- `amount` and `net_amount` stay stored rather than computed on read, so the
-- dashboards and the invoice table keep working unchanged; this trigger is what
-- keeps them true.
-- ---------------------------------------------------------------------

create or replace function recalc_invoice_totals()
returns trigger
language plpgsql
security definer
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

drop trigger if exists on_invoice_lines_changed on invoice_lines;
create trigger on_invoice_lines_changed
  after insert or update or delete on invoice_lines
  for each row execute function recalc_invoice_totals();

-- ---------------------------------------------------------------------
-- 4. The paid-movement trigger now follows `status`, not the boolean.
-- ---------------------------------------------------------------------

drop trigger if exists on_invoice_paid on invoices;

create or replace function handle_invoice_paid()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  default_account_id uuid;
begin
  if new.status = 'paid' and old.status is distinct from 'paid' then
    select id into default_account_id from accounts
      where user_id = new.user_id order by created_at limit 1;

    insert into movements (
      user_id, date, description, account_id, amount, type,
      client_id, invoice_id, source
    ) values (
      new.user_id,
      coalesce(new.paid_date, current_date),
      'Cobro factura ' || coalesce(new.invoice_number, ''),
      default_account_id,
      new.net_amount,
      'freelance',
      new.client_id,
      new.id,
      'manual'
    )
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger on_invoice_paid
  after update of status on invoices
  for each row execute function handle_invoice_paid();
