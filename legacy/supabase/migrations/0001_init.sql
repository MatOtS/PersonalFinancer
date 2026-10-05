-- MVP schema: Dashboard de Finanzas Personales + Freelance
-- Single-user app, but every table is scoped by user_id + RLS so it stays
-- correct if more users are ever added.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Core tables
-- ---------------------------------------------------------------------

create table accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  name text not null
);

create table subcategories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  category_id uuid not null references categories(id) on delete cascade,
  name text not null
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  client_id uuid not null references clients(id),
  issue_date date not null default current_date,
  invoice_number text not null,
  amount numeric(12, 2) not null,
  irpf_pct numeric(5, 2) not null default 0,
  iva_pct numeric(5, 2) not null default 0,
  net_amount numeric(12, 2) not null,
  issued boolean not null default true,
  paid boolean not null default false,
  paid_date date,
  created_at timestamptz not null default now(),
  unique (user_id, invoice_number)
);

create table movements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  date date not null default current_date,
  description text not null,
  account_id uuid not null references accounts(id),
  category_id uuid references categories(id),
  subcategory_id uuid references subcategories(id),
  amount numeric(12, 2) not null, -- positive = ingreso, negative = gasto
  type text not null check (type in ('personal', 'freelance')),
  is_fixed_expense boolean not null default false,
  client_id uuid references clients(id),
  invoice_id uuid references invoices(id),
  source text not null default 'manual' check (source in ('manual', 'csv_import')),
  created_at timestamptz not null default now()
);

create index movements_user_date_idx on movements (user_id, date desc);
create index movements_dedupe_idx on movements (user_id, date, description, amount);

create table fixed_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  name text not null,
  amount numeric(12, 2) not null,
  frequency text not null check (frequency in ('monthly', 'bimonthly', 'quarterly', 'annual')),
  account_id uuid references accounts(id),
  category_id uuid references categories(id),
  subcategory_id uuid references subcategories(id),
  active boolean not null default true
);

create table csv_import_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  bank_name text not null,
  column_mapping jsonb not null, -- { date, description, amount, account }
  unique (user_id, bank_name)
);

create table category_keywords (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  keyword text not null,
  category_id uuid not null references categories(id) on delete cascade,
  subcategory_id uuid references subcategories(id)
);

create table user_settings (
  user_id uuid primary key references auth.users(id) default auth.uid(),
  default_irpf_pct numeric(5, 2) not null default 15,
  default_iva_pct numeric(5, 2) not null default 21,
  invoice_number_format text not null default 'YYYY-NNN',
  invoice_number_next int not null default 1
);

-- ---------------------------------------------------------------------
-- Derived view: current balance per account
-- ---------------------------------------------------------------------

create view account_balances as
select
  a.id as account_id,
  a.user_id,
  a.name,
  coalesce(sum(m.amount), 0) as current_balance
from accounts a
left join movements m on m.account_id = a.id
group by a.id, a.user_id, a.name;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------

alter table accounts enable row level security;
alter table categories enable row level security;
alter table subcategories enable row level security;
alter table clients enable row level security;
alter table invoices enable row level security;
alter table movements enable row level security;
alter table fixed_expenses enable row level security;
alter table csv_import_profiles enable row level security;
alter table category_keywords enable row level security;
alter table user_settings enable row level security;

create policy "owner all accounts" on accounts for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner all categories" on categories for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner all subcategories" on subcategories for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner all clients" on clients for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner all invoices" on invoices for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner all movements" on movements for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner all fixed_expenses" on fixed_expenses for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner all csv_import_profiles" on csv_import_profiles for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner all category_keywords" on category_keywords for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner all user_settings" on user_settings for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Function: when an invoice is marked paid, create/refresh its linked
-- freelance movement so balances and charts update automatically.
-- ---------------------------------------------------------------------

create or replace function handle_invoice_paid()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  default_account_id uuid;
begin
  if new.paid = true and (old.paid is distinct from true) then
    select id into default_account_id from accounts
      where user_id = new.user_id order by created_at limit 1;

    insert into movements (
      user_id, date, description, account_id, amount, type,
      client_id, invoice_id, source
    ) values (
      new.user_id,
      coalesce(new.paid_date, current_date),
      'Cobro factura ' || new.invoice_number,
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
  after update of paid on invoices
  for each row execute function handle_invoice_paid();

-- ---------------------------------------------------------------------
-- Seed data (executed per-user on first login, see app bootstrap)
-- Kept here as reference defaults; actual insert happens from the app
-- with the authenticated user's id.
-- ---------------------------------------------------------------------
