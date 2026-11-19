-- Invoices (work item 008): the billing data of the user, the invoices, their
-- lines, and the one operation that must be atomic: taking the next number.
-- Money is integer cents and percentages are basis points (1500 = 15 %); the
-- totals are computed in src/domain/invoices.ts, not stored (ADR-05).

create table user_settings (
  user_id uuid primary key default auth.uid()
    references auth.users on delete cascade,
  issuer_name text, issuer_tax_id text, issuer_phone text,
  issuer_address text, issuer_email text, issuer_iban text,
  default_irpf_bp int not null default 1500
    check (default_irpf_bp between 0 and 10000),
  default_iva_bp int not null default 2100
    check (default_iva_bp between 0 and 10000),
  invoice_number_format text not null default 'YYYY-NNN'
    check (invoice_number_format like '%NNN%'
           and char_length(invoice_number_format) <= 30),
  invoice_number_next int not null default 1
    check (invoice_number_next between 1 and 999999),
  due_days int not null default 30 check (due_days between 0 and 365),
  constraint user_settings_text_clean check (
    (issuer_name is null or (issuer_name = btrim(issuer_name) and char_length(issuer_name) between 1 and 100))
    and (issuer_tax_id is null or (issuer_tax_id = btrim(issuer_tax_id) and char_length(issuer_tax_id) between 1 and 30))
    and (issuer_phone is null or (issuer_phone = btrim(issuer_phone) and char_length(issuer_phone) between 1 and 30))
    and (issuer_address is null or (issuer_address = btrim(issuer_address) and char_length(issuer_address) between 1 and 200))
    and (issuer_email is null or (issuer_email = btrim(issuer_email) and char_length(issuer_email) between 1 and 200))
    and (issuer_iban is null or (issuer_iban = btrim(issuer_iban) and char_length(issuer_iban) between 1 and 40))
  )
);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users on delete cascade,
  client_id uuid not null,
  issue_date date not null,
  due_date date,
  -- Null while it is a draft: the number is taken when it is issued, so a
  -- discarded draft leaves no gap in the series.
  invoice_number text,
  irpf_bp int not null default 0 check (irpf_bp between 0 and 10000),
  iva_bp int not null default 0 check (iva_bp between 0 and 10000),
  status text not null default 'draft'
    check (status in ('draft', 'issued', 'paid')),
  paid_date date,
  created_at timestamptz not null default now(),
  unique (user_id, invoice_number),
  -- Target of the keys of the lines and the movement of the payment.
  unique (id, user_id),
  constraint invoices_number_when_issued
    check ((status = 'draft') = (invoice_number is null)),
  constraint invoices_client_fkey
    foreign key (client_id, user_id) references clients (id, user_id)
);

create table invoice_lines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users on delete cascade,
  invoice_id uuid not null,
  position int not null default 0,
  description text not null
    check (description = btrim(description)
           and char_length(description) between 1 and 200),
  -- Hundredths: 150 is 1,5 units (hours, days...).
  quantity_hundredths bigint not null
    check (quantity_hundredths between 1 and 99999999),
  unit_price_cents bigint not null
    check (unit_price_cents between 0 and 99999999999),
  constraint invoice_lines_invoice_fkey
    foreign key (invoice_id, user_id)
    references invoices (id, user_id) on delete cascade
);

alter table user_settings enable row level security;
alter table invoices enable row level security;
alter table invoice_lines enable row level security;

create policy "owner all user_settings" on user_settings
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner all invoices" on invoices
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner all invoice_lines" on invoice_lines
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ADR-24. Runs with the rights of the caller (security invoker), so the
-- policies above still apply. The settings row is locked, so two invoices
-- issued at the same time cannot take the same number.
create function issue_invoice(p_id uuid, p_year int)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_format text;
  v_next int;
  v_number text;
begin
  insert into user_settings (user_id) values (auth.uid())
    on conflict (user_id) do nothing;
  select invoice_number_format, invoice_number_next
    into v_format, v_next
    from user_settings where user_id = auth.uid() for update;

  v_number := replace(replace(v_format, 'YYYY', p_year::text),
                      'NNN', lpad(v_next::text, 3, '0'));

  update invoices set status = 'issued', invoice_number = v_number
    where id = p_id and status = 'draft';
  if not found then
    raise exception 'The invoice is not a draft' using errcode = 'P0002';
  end if;

  update user_settings set invoice_number_next = v_next + 1
    where user_id = auth.uid();
  return v_number;
end;
$$;
