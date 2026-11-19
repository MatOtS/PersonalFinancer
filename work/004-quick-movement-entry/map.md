# Map 004: Quick movement entry

Spec: `work/004-quick-movement-entry/spec.md`

## Explored context
Learning is `off`. The owner chose a guided read of the 003 migration as the knowledge gate (done 2026-11-18: `unique (user_id, name_key)`, the `using` policy, and why a plain foreign key lets user B point at user A's account).

What exists and is reused:
- **Domain** (`src/domain/`): `money.ts` (`parseAmount` accepts an empty text as 0 and a minus sign; `formatCents`, `INVALID_AMOUNT`), `names.ts` (`cleanName`, `compareNames`, `nameKey`). Pure, tests next to them.
- **Data layer** (`src/data/`): every operation is a pair, `xxxWithClient(client, ...)` (logic, what tests call) and a wrapper that creates the real client. Results are `{ ok: true } | { ok: false, error: <Spanish message> }`. Messages live in the data layer (`ACCOUNT_GONE`, `CATEGORY_GONE`, `SUBCATEGORY_GONE`, `DUPLICATE_*`). `listAccounts()` and `listCategories()` already return sorted data (categories grouped by kind with subcategories). `createSubcategoryWithClient` reads the parent before inserting.
- **Database** (`supabase/migrations/20261029120000_accounts_categories_profiles.sql`): `accounts` (unique `(user_id, name_key)`), `categories` (`unique (id, user_id, kind)`, composite foreign key `(parent_id, user_id, kind)` with cascade), one `for all` policy per table (`using` and `with check`). PostgreSQL 17. pgTAP isolation test in `supabase/tests/database/isolation.test.sql`.
- **Settings page** (`src/app/(app)/ajustes/`): Server Actions return state objects; `AccountList` holds one `notice` line, one `ConfirmDialog` (native `<dialog>`) and runs the delete through a hidden form; `CategoryList` asks `countSubcategoriesAction` when "Eliminar" is pressed (the precedent for a read-only action called from the browser).
- **UI** (`src/components/ui/`): `Button`, `TextField`, `SegmentedControl` (radio buttons), `ConfirmDialog`, `EmptyState`, `ProgressBar`. Shell in `src/components/shell/` (`Sidebar`, `NavItem`, `ThemeControl`...). The `(app)` layout renders `Sidebar` and `<main>`; there is **no top bar yet**, although `docs/design.md` asks for one with the primary action.
- **Tests**: Vitest (`renderToStaticMarkup`, mocks of `@/data/*`), pgTAP, Playwright with unique names, `watchConsole`/`expectNoConsoleErrors`, user A shared session and B/C through the form.
- **Design** (`docs/design.md`): modals `raised`, `lg` radius, `scrim` behind, close with Esc, the close button and the backdrop, focus trapped; toasts bottom right on desktop, 5 s, pausable; inline messages for validation.
- Context7 was not available during this map (invalid API key), so the Base UI API was not checked: it must be checked when S5 starts.

## Change map
| File | Action | Functions and signatures | Scenarios |
|---|---|---|---|
| `src/domain/movements.ts` (+ test) | create | `MovementKind = "expense" \| "income"`, `WorkKind = "personal" \| "freelance"`, `MAX_MOVEMENT_CENTS`, `parseMovementAmount(raw): { cents } \| { error }`, `validateDescription(raw)`, `validateMovement(input): { errors, value }`, `dateOrToday(raw, today)`, `todayInMadrid(now?)` | amount valid, amount max, zero accepted, required missing, description max, spaces removed, any date, date never empty |
| `supabase/migrations/<new>_movements.sql` | create | table `movements`; `unique (id, user_id)` on `accounts`; `unique (id, user_id)` and `unique (id, user_id, parent_id)` on `categories`; composite foreign keys; RLS policy | other user's data, other user's movements, account deletes movements, category deletes keep movements, subcategory belongs to its category (database) |
| `supabase/tests/database/movements-isolation.test.sql` | create | pgTAP: read, insert, update, delete as B; foreign keys; cascade and set null | same |
| `src/lib/supabase/database.types.ts` | regenerate | `npm run db:types` | none |
| `src/data/movements.ts` (+ test) | create | `createMovementWithClient(client, input): Promise<MovementResult>`, `createMovement(input)`, `countMovementsWithClient(client, accountId): Promise<number>`, `countMovements(accountId)` | saving, no longer exists, saved for that user |
| `src/app/(app)/ajustes/actions.ts` (+ test) | modify | add `countMovementsAction(accountId): Promise<number>` | the account deletion says how many movements go with it |
| `src/app/(app)/ajustes/account-list.tsx` | modify | ask the count when "Eliminar" is pressed; `deleteAccountText(name, movements)` exported | same; deleting an account deletes its movements |
| `package.json`, `docs/architecture.md` | modify | Base UI 1.x dependency; ADR-20 | none (dependency approved by the owner) |
| `src/components/ui/dialog.tsx`, `select.tsx`, `toast.tsx` | create | wrappers on Base UI: `Dialog`, `Select`, `ToastProvider` + `useToast` | form opens/closes, lists, confirmation |
| `src/components/shell/top-bar.tsx` | create | `TopBar` with the button on the right | the form opens from any screen |
| `src/app/(app)/layout.tsx` | modify | render `TopBar` and the toast provider | same |
| `src/app/(app)/movement-actions.ts` (+ test) | create | `loadMovementFormAction(): Promise<{ accounts, categories }>`, `createMovementAction(prev, formData): Promise<MovementFormState>` | opens, saving, errors, no longer exists, no accounts, twice |
| `src/components/movements/movement-form.tsx`, `new-movement-button.tsx` | create | the form, its state and fields; the button that opens the dialog and loads the lists | all the form scenarios |
| `tests/e2e/movements.spec.ts`, `isolation.spec.ts`, `settings.spec.ts`, `keyboard.spec.ts` | create / modify | browser tests of the form and of the settings confirmation | all |

## Slices
Each slice: at most 200 changed lines, in dependency order. **There are 8: more than 6, so splitting the work item is proposed** (see Risks and the question at the end of the map).
- [x] **S1. Movement rules (domain).** Scenarios: The amount must be a valid amount; The amount has a maximum; An amount of zero is accepted; A required data is missing (messages); The description has a maximum length; Spaces around the description are removed; Any date is accepted; The date is never left empty; The date starts as today. Files: `src/domain/movements.ts` and its test.
  - Done when: unit tests green, `npm run check` green.
- [x] **S2. Movements table and security (migration).** Scenarios: One user cannot use another user's data in a movement; One user cannot see or change another user's movements; Deleting an account deletes its movements; Deleting a category or a subcategory keeps the movements; (database) the subcategory belongs to its category. Files: migration, `movements-isolation.test.sql`, `database.types.ts`.
  - Done when: `npm run test:db` green, including a policy-weakening mutation check (as in S4 of 003), `npm run check` green.
- [x] **S3. Movements data layer.** Scenarios: Saving a movement (the data part: saved for that user); Saving with an account or a category that no longer exists; Spaces around the description. Files: `src/data/movements.ts` and its test.
  - Done when: unit tests green (fake network, order of the reads and the save recorded), `npm run check` green.
- [x] **S4. Settings: the account deletion says how many movements go.** Scenarios: The account deletion says how many movements go with it. Files: `ajustes/actions.ts`, `account-list.tsx`, tests.
  - Done when: unit tests green (`deleteAccountText` with 0, 1 and N), the existing e2e of deleting an account still green, `npm run check` green.
- [x] **S5. Base UI, building blocks and the top bar.** Scenarios: The form opens from any screen (the button and the dialog opening and closing). Files: `package.json`, `docs/architecture.md` (ADR-20), `ui/dialog.tsx`, `ui/select.tsx`, `ui/toast.tsx`, `shell/top-bar.tsx`, `(app)/layout.tsx`.
  - Done when: unit tests green, the dialog opens and closes with Esc, the close button and the backdrop with the focus trapped and returned, zero console errors and zero CSP violations in the browser (in development and in a production build).
- [x] **S6. The movement form (opening and saving).** Scenarios: The form asks for all the data; Which data is required (fields); Everything else starts empty; Saving a movement (the form closes and the toast says "Movimiento añadido con éxito"); Closing the form discards what was typed; The lists of the form are ordered alphabetically; The category list does not depend on the type; Changing the category clears the subcategory; A subcategory needs its category; A category alone is enough; The fixed mark and personal or freelance are only stored. Files: `movement-actions.ts`, `movement-form.tsx`, `new-movement-button.tsx`.
  - Done when: unit tests green, `npm run check` green, the form saves a movement in the browser.
- [x] **S7. The form: errors and edge cases.** Scenarios: A required data is missing; The amount must be valid / maximum / zero; The description has a maximum length; A user with no accounts is taken to create one; Saving with something that no longer exists (stays open, keeps what was typed, clears only that choice); Saving twice in a row saves one movement; The form and saving need a session. Files: `movement-form.tsx`, `movement-actions.ts`, their tests.
  - Done when: unit tests green, `npm run check` green.
- [x] **S8. Browser tests, accessibility and visual check.** Scenarios: all of the browser ones, including the keyboard-only flow and the ownership of movements from the API. Files: `tests/e2e/movements.spec.ts`, `isolation.spec.ts`, `settings.spec.ts`, `keyboard.spec.ts`.
  - Done when: `npm run test:e2e`, `npm run test:db` and `npm run check` green, zero console errors and policy violations, and the button, the form (empty, with errors, with the no-accounts notice) and the toast match `docs/design.md` in light and dark at 1280 px.

## Data
New table `movements` (migration, to be approved with this map), plus constraints added to two existing tables by a new migration (the applied one is never edited).

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` primary key | `gen_random_uuid()` |
| `user_id` | `uuid not null` | `default auth.uid()`, references `auth.users` on delete cascade |
| `kind` | `text not null` | check in (`expense`, `income`) |
| `amount_cents` | `bigint not null` | check between 0 and 99999999999 (999.999.999,99 €); always positive, the sign is applied by whoever calculates |
| `date` | `date not null` | |
| `description` | `text` | null when empty; check `= btrim(...)` and length between 1 and 200 |
| `account_id` | `uuid not null` | composite foreign key `(account_id, user_id)` to `accounts (id, user_id)`, on delete cascade |
| `category_id` | `uuid` | composite foreign key `(category_id, user_id)` to `categories (id, user_id)`, on delete set null (this column only) |
| `subcategory_id` | `uuid` | composite foreign key `(subcategory_id, user_id, category_id)` to `categories (id, user_id, parent_id)`, on delete set null (this column only); no check requires `category_id` when it is set (see the decision row of S2) |
| `work_kind` | `text not null` | check in (`personal`, `freelance`) |
| `is_fixed` | `boolean not null default false` | |
| `created_at` | `timestamptz not null default now()` | |

Changes to existing tables: `accounts`: `unique (id, user_id)`; `categories`: `unique (id, user_id)` and `unique (id, user_id, parent_id)`. No existing data changes. RLS: one `for all` policy with `using` and `with check` on `user_id = auth.uid()`, like the other tables.

## Decisions
Every design decision is the user's (artificer skill, Decisions belong to the human). Binding: Build stops on anything not listed here.
| Decision point | Type | Decided | Discarded alternatives | Reason (the user's words) | Decided by |
|---|---|---|---|---|---|
| Where the entry lives | reversible | A button at the top right opens a form of generous size, from any screen | Own page; inside Home | "un botón que abre un form, con un tamaño generoso, desde cualquier pantalla... esquina derecha" | Owner (spec) |
| How a movement stores its amount and type | one-way | One `movements` table with the type in its own column and the amount always positive in cents; the sign is applied when a calculation reads the type (expense subtracts) | Amount stored with sign | "al guardar se pone gasto, entonces en la DB sale el movimiento de tipo gasto, punto, no se puede confundir, cuando se use el movimiento para calcular se lee que es un GASTO y se le pone un signo negativo" | Owner |
| What happens to movements when what they use is deleted | one-way | Deleting an account deletes its movements; deleting a category or a subcategory keeps the movements and clears that category or subcategory | Block the deletion; keep movements without account | "los movimientos se borran cuando se borra su cuenta, pero no su categoría o subcategoría, simplemente se les quita esa cat o subcat" | Owner |
| The account deletion confirmation | reversible | It says how many movements go with the account; the settings code changes (new scenarios added to the spec) | Leave the confirmation as it is | "sí, debe avisar cuántos movimientos se borran, que se cambie el código. sí cámbialo" | Owner |
| How the form, lists and pop-up are built | one-way | Base UI as a new dependency (approved), for the modal, the lists and the toast. The 003 confirmation stays native | Native elements only | "vamos a probar la librería BaseUI sí, métela como dependencia aprobada"; "las 3" | Owner |
| When the accounts and categories are loaded | reversible | When the button is pressed, through a read-only Server Action like `countSubcategoriesAction` | With every page | "al pulsar el botón"; "lo mismo" | Owner |
| Double submit | reversible | Blocked in the browser only (the button is disabled while saving, so Enter does not send it either) | Also in the server | "bloqueando en el navegador debería ser suficiente" | Owner |
| Top bar, toast, folders | reversible | The top bar is created now with the button on the right; toast bottom right, 5 s, pausable; components in `src/components/` as in `docs/architecture.md` | None | "a. Sí b. sí d. lo que sea estándar" | Owner |
| The movement amount rules | reversible | A new function for movements, separate from `parseAmount` | One function with options | "1" | Owner |
| How the database keeps the data of one user | one-way | Same pattern as 003: composite foreign keys (new unique constraints on `accounts` and `categories`), and the database also checks that the subcategory belongs to the category | A different mechanism | "mismo patrón, si lo pide en el formulario debería llegar bien a la DB, no?" | Owner |
| How "ya no existe" is detected on save | reversible | The three references are read before inserting; a foreign key error at save time is still handled as gone | Insert first and read on error; read the error text | "A" | Owner |
| (S2, one-way) The database does not check that a subcategory comes with its category | A trigger that clears the category and the subcategory together when a category is deleted | Deleting a category made the database clear the category of the movement before its subcategory, and the check rejected that step, so the delete failed. Owner: "A" (remove the rule from the database; the form and the rules of the app still require it) | Owner |

Existing decisions that apply (cited, not asked again): ADR-06 money as integer cents; ADR-07 Base UI only for complex primitives (now used, see above); principles 3 (logic apart from UI), 5 (user data isolation with a database test), 6 (Spanish UI, `1.234,56 €`, `dd/mm/yyyy`); the `xxxWithClient` pattern and the `{ ok } | { ok: false, error }` result of 003; the messages "Esta cuenta/categoría/subcategoría ya no existe" of 003; the pending ADR-18 (native `<dialog>` for the 003 confirmation).
Revisited: none. The ADR-07 reading changes only in that Base UI is installed now.

## Risks
- **Too many slices (8).** The rule asks to propose splitting the work item. Natural cut: S1 to S4 (rules, table, data layer, settings change: no new screen) and S5 to S8 (interface).
- **Foreign keys and RLS.** A foreign key is checked without the policies of the referenced table, so a plain `account_id` would let B point at A's account. Mitigation: composite keys with `user_id`, and the S2 pgTAP test (including a mutation that removes a key).
- **`on delete set null` with a composite key.** Without the column list it would also null `user_id`. PostgreSQL 17 accepts `set null (column)`; to be proven in S2 with tests for deleting a category (its subcategories cascade) and a subcategory alone.
- **A subcategory without a category.** With a composite key, a null column skips the check, and the database does not refuse it (decision of S2). Only a forged request could store it; the form and `validateMovement` require the category. Mitigation to consider in S6: the server action rejects a subcategory without category.
- **Deleting an account silently deletes movements.** Mitigated by the new confirmation (S4). Deleting a category does not warn (not asked).
- **Base UI.** Its API was not checked (no documentation access during this map). Risk with the strict production CSP (inline styles) and with form submission from a custom select: check in S5 in a production build, zero CSP violations is part of "Done when".
- **The date input.** The browser lets the user clear it; the form puts today back without a message (owner decision). Dates use Europe/Madrid (`docs/architecture.md`), so "today" at night can differ from the UTC day: covered in S1.
- **Color-only error** for personal or freelance: accepted by the owner, backlog item 29.
- **Large browser test file.** S8 will be bigger than 200 lines, as S10 of 003 was; built whole if the owner decides so.
- **Saving after the session ended (found in S7, backlog bug 30).** The proxy answers the Server Action of a user with no session with a redirect to the sign-in page, and the browser fails with "An unexpected response was received from the server" instead of showing it. The settings forms of 003 behave the same way. The browser test of this case is `test.fixme` in `tests/e2e/movements.spec.ts` until backlog bug 30 is fixed. Decided by the owner on 2026-11-18: leave it as a bug.
- **Base UI under the strict policy (found in S6).** Its list adds a `<style>` element that the browser blocked even with the nonce; `BaseUiProvider` passes the nonce and turns those elements off (the list shows its scrollbar). Documented in ADR-20.
- **Decisions of the build that were not in the map (to confirm in the verify):** the database does not require a category for a subcategory (owner chose A in S2); a second foreign key clears the subcategory in any order (S2); the top bar is not sticky; UI texts chosen while building (see the S6 and S7 report).
- **Changes after the first QA (owner, 2026-11-19), recorded here and not in the spec.** (1) The category and subcategory lists are alphabetical but "Otros" is always last, in the form and in the settings page (`compareCategoryNames` in `src/domain/names.ts`); "Otros ingresos" is not included, the owner will review it later. This replaces "ordered alphabetically" of the spec for categories. (2) The confirmation toast is green (`positive`) and disappears after 3 seconds (it was 5, as in `docs/design.md`, now updated). (3) Bug fixed: after a save with errors the radio buttons (type, personal or freelance) were unchecked because React resets a form sent through `action`; the form is now sent through `onSubmit`.
