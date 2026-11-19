-- Movements and invoices (work item 010): a movement may come from paying an
-- invoice, with the client, and remembers where it came from.

alter table movements
  add column client_id uuid,
  add column invoice_id uuid,
  add column source text not null default 'manual'
    check (source in ('manual', 'import', 'invoice')),
  add constraint movements_client_fkey
    foreign key (client_id, user_id)
    references clients (id, user_id) on delete set null (client_id),
  add constraint movements_invoice_fkey
    foreign key (invoice_id, user_id)
    references invoices (id, user_id) on delete set null (invoice_id);

-- One movement per invoice: paying twice cannot create two.
create unique index movements_one_per_invoice
  on movements (invoice_id) where invoice_id is not null;

-- ADR-24. Security invoker: the policies apply. The amount comes from the app
-- (the totals live in src/domain/invoices.ts). The income goes to the first
-- account the user created.
create function pay_invoice(p_id uuid, p_date date, p_amount_cents bigint)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_invoice invoices;
  v_account uuid;
begin
  select * into v_invoice from invoices
    where id = p_id and status = 'issued' for update;
  if not found then
    raise exception 'The invoice is not issued' using errcode = 'P0002';
  end if;

  select id into v_account from accounts order by created_at limit 1;
  if v_account is null then
    raise exception 'The user has no accounts' using errcode = 'P0003';
  end if;

  update invoices set status = 'paid', paid_date = p_date where id = p_id;
  insert into movements (
    kind, amount_cents, date, description, account_id, work_kind,
    client_id, invoice_id, source
  ) values (
    'income', p_amount_cents, p_date,
    'Cobro factura ' || v_invoice.invoice_number, v_account, 'freelance',
    v_invoice.client_id, p_id, 'invoice'
  );
end;
$$;
