# Decisions for 005 to 012 (approved by the owner on 2026-11-19, "aprobado, construí")

Written 2026-11-19. The owner asked to imitate the previous app and not wait for approvals except for critical things. These three kinds of change need the owner by the global rules (dependencies, data model, `security definer`), so nothing below is built yet.

## 1. New dependencies (each needs an ADR)
| Package | Used by | Why (previous app) |
|---|---|---|
| `papaparse` (+ types) | 005 | reads CSV files; the previous app wrote its own readers only for the two Excel formats |
| `recharts` | 011, 012 | the category chart and the cash flow chart |
| `@react-pdf/renderer` | 009 | makes the invoice PDF on the server |

## 2. Data model (new tables and columns; all with `user_id`, RLS and a pgTAP isolation test; money in cents)
| Work item | Change |
|---|---|
| 005 | `bank_profiles` (one row per account: the columns date, description, amount and sign) ; `category_keywords` (word, category, optional subcategory) |
| 006 | `fixed_expenses` (name, amount, frequency, active, optional account, category, subcategory) |
| 007 | `clients` (name, tax id, address, email) |
| 008 | `user_settings` (issuer data, IBAN, default IRPF and IVA, number format, next number, due days) ; `invoices` (client, dates, number nullable until issued, percentages, status draft, issued or paid, paid date) ; `invoice_lines` |
| 009 | a storage bucket for the logo, and `logo_path` in `user_settings` |
| 010 | `movements`: `client_id`, `invoice_id` (unique where not null) and `source` |

## 3. Design decision with a rule of the project
The previous app did three things with database triggers, two of them `security definer` (the project rule: none without an ADR):
- recompute the totals of an invoice from its lines,
- assign the correlative number when issuing without gaps or repeats,
- create the income movement when an invoice becomes paid, once only.

The alternative is to do them in the app inside one database transaction (no `security definer`).

## Not done, no model in the previous app
- Tax reserve (VAT and IRPF), backlog item 12.

## How it was built
- Dependencies: `papaparse`, `recharts`, `@react-pdf/renderer` (ADR-21, 22, 23).
- Data model: as listed, in the migrations `20261119100000` to `20261119150000`. The logo lives in the private bucket `branding` (storage enabled in `supabase/config.toml`, ADR-14).
- Triggers: none. `issue_invoice` and `pay_invoice` are two functions with `security invoker` (ADR-24); the totals are computed in `src/domain/invoices.ts`.
