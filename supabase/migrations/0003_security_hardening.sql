-- Security and data-integrity hardening, required before exposing the app on a
-- public URL (e.g. a Vercel pre-production deployment).

-- ---------------------------------------------------------------------
-- 1. account_balances bypassed RLS.
--
-- A Postgres view runs with the privileges of its OWNER, not of the querying
-- user, unless security_invoker is set. `account_balances` is owned by the
-- migration role, so selecting from it skipped the row level security on
-- `accounts` and `movements` entirely: any authenticated user could read every
-- user's account names and balances. Supabase's own linter flags this as
-- `security_definer_view`.
--
-- With security_invoker = on the view evaluates the underlying tables as the
-- calling user, so their RLS policies apply as intended.
-- ---------------------------------------------------------------------

alter view account_balances set (security_invoker = on);

-- ---------------------------------------------------------------------
-- 2. Re-marking an invoice as paid duplicated the income movement.
--
-- handle_invoice_paid() inserts the linked "Cobro factura" movement with
-- `on conflict do nothing`, but no constraint existed that such an insert could
-- ever conflict with, so the clause never fired. Toggling an invoice paid ->
-- unpaid -> paid inserted a second movement, silently inflating both income and
-- the account balance.
--
-- One movement per invoice is the intended invariant; this index enforces it and
-- makes the existing `on conflict do nothing` behave as written.
-- ---------------------------------------------------------------------

create unique index if not exists movements_invoice_id_key
  on movements (invoice_id)
  where invoice_id is not null;
