# Map 003: Accounts and categories

Spec: `work/003-accounts-categories/spec.md`

## Explored context
First work item that stores user data. It needs three things that do not exist yet: tables with RLS (`supabase/migrations/` and `supabase/tests/` are empty), a data layer that reads and writes them (`src/data` only has auth), and Server Actions that change data. The pieces to reuse are the sign-in form pattern (`useActionState` + Server Action, `src/app/login/`), `Button`, `TextField`, `EmptyState`, the sidebar `NavItem`, and the injectable-client style of `src/data/auth.ts` (a test passes a fake client). `src/lib/supabase/server.ts` creates the client per request; it gets the generated `Database` type.

**Logic** (pure, in `src/domain`, unit tested):
- `names.ts`: `cleanName(raw)` trims; `validateName(raw)` returns `"Introduce un nombre"`, `"El nombre es demasiado largo (máximo 50 caracteres)"` (51 or more) or `null`; `nameKey(name)` is the trimmed, lower-case, accent-free form used to detect duplicates (`ñ` is a letter of its own, so it is kept: "año" and "ano" are different names); `compareNames(a, b)` orders with the Spanish collator ignoring capitals and accents.
- `money.ts`: `parseAmount(raw)` returns `{ ok: true, cents } | { ok: false }`: accepts `1.250,00`, `1250,5`, `-350`; empty is `0`; `abc`, `12,345` and amounts beyond the safe integer range are not valid; `formatCents(cents)` returns `1.250,00 €` / `-350,00 €`.
- `default-categories.ts`: the list of the spec (11 expense categories with 26 subcategories, 4 income categories) as data.

**Algorithms.**
- Every change goes: form → Server Action → clean and validate with `domain` → `src/data` → database. The database repeats the hard rules (length, uniqueness, ownership).
- Duplicates: the app computes `name_key` with `nameKey` and the database refuses a second row with the same key (unique index); the data layer turns that error (code `23505`) into "Ya tienes una cuenta con ese nombre". The rule lives in one place (`nameKey`), the database only enforces it.
- "Changing something that no longer exists": every update and delete asks for the changed row back (`select`); zero rows means it is gone (or never was the user's), and the action answers "Esta cuenta ya no existe" and refreshes the list. RLS makes another user's row look the same as a missing one.
- Delete a category: one delete; its subcategories go with it (`on delete cascade`). The confirmation counts them first.
- Default categories (`ensureDefaultCategories`): called after a successful sign-in. If the user's `profiles` row says they were already given, stop. Otherwise insert categories and subcategories ignoring conflicts, then write the marker last, so a failure halfway is simply retried at the next sign-in. Failure never blocks signing in. After that the marker keeps deleted defaults from coming back.
- Confirmation: a native `<dialog>` opened with `showModal()` (focus trapped, Escape closes, background inert, focus returns by itself). Buttons "Cancelar" (initial focus) and "Eliminar".

**UI.** Sidebar item "Ajustes" (gear icon). `/ajustes`: title "Ajustes", two cards "Cuentas" and "Categorías" (anchors `#cuentas`, `#categorias`). Accounts: list of rows (name, opening balance right-aligned with tabular figures, edit and delete), add form on top, `EmptyState` when none. Categories: expenses and income groups, each category with its subcategories, inline add, rename and delete. Errors under the field, the "no longer exists" message in a live region. Home: the empty state gets a button "Añadir cuenta" (link to `/ajustes#cuentas`) while there are no accounts.

**Planned tests.** Unit: the three domain files, the data layer with a fake client (duplicate, zero rows, defaults idempotent). pgTAP: user A and user B, read, insert, update, delete, subcategory in another user's category. Browser: every user-facing scenario, a fresh user for the defaults, B calling the REST API against A's rows, keyboard-only flow, zero console errors. Visual check at 1280 px, light and dark.

## Change map
| File | Action | Functions and signatures | Scenarios |
|---|---|---|---|
| `src/domain/names.ts` (+ test) | create | `cleanName`, `validateName`, `nameKey`, `compareNames` | Spaces around a name are removed; A name has a maximum length; An account needs a name; Two accounts cannot have the same name; Lists are ordered alphabetically; A category or subcategory needs a name and cannot repeat one |
| `src/domain/default-categories.ts` (+ test) | create | `DEFAULT_CATEGORIES` | A new user starts with the default categories and no accounts |
| `src/domain/money.ts` (+ test) | create | `parseAmount`, `formatCents` | The opening balance must be a valid amount; An empty opening balance counts as zero; The opening balance can be negative; The user adds an account |
| `supabase/migrations/<timestamp>_accounts_categories.sql` | create | tables `profiles`, `accounts`, `categories`, constraints, RLS | One user cannot see another user's data; One user cannot change another user's data; Two accounts cannot have the same name |
| `src/lib/supabase/database.types.ts` | create (generated) | `npm run db:types` | (types) |
| `supabase/tests/database/isolation.test.sql` | create | pgTAP isolation test | One user cannot see another user's data; One user cannot change another user's data |
| `src/lib/supabase/server.ts` | modify | `createServerClient<Database>` | (types) |
| `src/data/accounts.ts` (+ test) | create | `listAccounts`, `createAccount`, `updateAccount`, `deleteAccount` | the account scenarios; Changing something that no longer exists |
| `src/data/categories.ts` (+ test) | create | `listCategories`, `createCategory`, `renameCategory`, `deleteCategory`, `countSubcategories`, `ensureDefaultCategories` | the category scenarios; Default categories are given once and then belong to the user |
| `src/app/login/actions.ts` | modify | call `ensureDefaultCategories` after a successful sign-in | A new user starts with the default categories and no accounts |
| `src/components/ui/confirm-dialog.tsx` | create | `ConfirmDialog` | Cancelling a deletion keeps everything; The user deletes an account / a subcategory / a category |
| `src/components/ui/text-field.tsx` | modify | optional right alignment for amounts | The user adds an account |
| `src/app/(app)/ajustes/page.tsx` | create | settings page | Settings is reached from the sidebar; The settings page needs a session |
| `src/app/(app)/ajustes/actions.ts` | create | `addAccountAction`, `updateAccountAction`, `deleteAccountAction`, `addCategoryAction`, `renameCategoryAction`, `deleteCategoryAction` | all the account and category scenarios |
| `src/app/(app)/ajustes/accounts-section.tsx` + forms | create | list, add and edit forms, empty state | the account scenarios; Lists are ordered alphabetically |
| `src/app/(app)/ajustes/categories-section.tsx` + forms | create | groups, subcategories, add, rename, delete | the category scenarios; The type of a category cannot be changed |
| `src/components/shell/sidebar.tsx` | modify | "Ajustes" item | Settings is reached from the sidebar |
| `src/app/(app)/page.tsx` | modify | "Añadir cuenta" action when there are no accounts | Home points to the first account |
| `supabase/seed.sql` | modify | third fake user (never signed in elsewhere) | (tests) |
| `tests/e2e/settings.spec.ts`, `isolation.spec.ts`, `support/users.ts` | create / modify | browser tests | all |
| `docs/architecture.md` | modify | ADR-18 (native dialog), ADR-19 (name key and default categories), data model table | - |

## Slices
Done in dependency order. Estimates are changed lines including tests; if a slice goes over 200 while building, it is split before continuing.
- [x] **S1. Name rules and default categories (domain).** About 150 lines (273 in the end, accepted by the owner). Scenarios: Spaces around a name are removed; A name has a maximum length; An account needs a name; Lists are ordered alphabetically; Two accounts cannot have the same name (the comparison key). Files: `names.ts`, `default-categories.ts` (+ tests).
  - Done when: unit tests green for 0, 1, 50, 51 characters, only spaces, accents, capitals, `ñ` kept different from `n` ("año" is not "ano"), ordering, and the default list has 11 expense categories with 26 subcategories and 4 income categories.
- [x] **S2. Amount rules (domain).** About 130 lines (147 in the end). Scenarios: The opening balance must be a valid amount; An empty opening balance counts as zero; The opening balance can be negative. Files: `money.ts` (+ test).
  - Done when: unit tests green for `1.250,00`, `1250,5`, `-350`, empty, `abc`, `12,345`, `0`, a huge number, and `formatCents` gives `1.250,00 €`, `-350,00 €`, `0,00 €`.
- [ ] **S3. Tables and security (migration).** About 120 lines of SQL. Scenarios: the schema side of One user cannot see / change another user's data, Two accounts cannot have the same name. Files: the migration, `database.types.ts` (generated), `server.ts`.
  - Done when: `npm run db:reset` applies it, `npm run db:types` regenerates the types, `npm run typecheck` passes, every table has RLS enabled with `using` and `with check`.
- [ ] **S4. Isolation test (pgTAP).** About 130 lines. Scenarios: One user cannot see another user's data; One user cannot change another user's data. Files: `supabase/tests/database/isolation.test.sql`.
  - Done when: `npm run test:db` is green, and breaking a policy on purpose (removing a `with check`) turns it red.
- [ ] **S5. Accounts data layer.** About 170 lines. Scenarios: the account scenarios at data level; Changing something that no longer exists (accounts). Files: `src/data/accounts.ts` (+ test).
  - Done when: unit tests green with a fake client (create, rename, correct balance, delete, duplicate gives the message, zero rows gives "ya no existe"); listing comes back in `compareNames` order.
- [ ] **S6. Confirmation dialog and account actions.** About 180 lines. Scenarios: Cancelling a deletion keeps everything; The user deletes an account. Files: `confirm-dialog.tsx`, `text-field.tsx`, `ajustes/actions.ts` (account actions).
  - Done when: the dialog opens with focus on "Cancelar", Escape and "Cancelar" close it without deleting, the focus goes back to the button that opened it, and the actions return the exact Spanish messages.
- [ ] **S7. Settings page with accounts, sidebar and Home.** About 200 lines. Scenarios: Settings is reached from the sidebar; The settings page needs a session; the account scenarios; Home points to the first account; Lists are ordered alphabetically. Files: `ajustes/page.tsx`, `accounts-section.tsx` + forms, `sidebar.tsx`, `(app)/page.tsx`.
  - Done when: signed in, "Ajustes" appears and is active on `/ajustes`; an account can be added, renamed, corrected and deleted from the page; Home shows "Añadir cuenta" only with zero accounts; without a session `/ajustes` goes to the sign-in page.
- [ ] **S8. Categories data layer and default categories.** About 190 lines. Scenarios: A new user starts with the default categories and no accounts; Default categories are given once and then belong to the user. Files: `src/data/categories.ts` (+ test), `login/actions.ts`, `seed.sql`.
  - Done when: unit tests green (categories and subcategories CRUD at data level, duplicates, defaults idempotent, the marker written last, a failure does not block the sign-in); a fresh local user signing in gets the list of the spec and signing in again adds nothing.
- [ ] **S9. Categories in the settings page.** About 200 lines. Scenarios: the category scenarios; The type of a category cannot be changed; Changing something that no longer exists (categories). Files: `ajustes/actions.ts` (category actions), `categories-section.tsx` + forms.
  - Done when: categories and subcategories can be added, renamed and deleted from the page; the type is chosen only when adding; deleting a category with subcategories says how many go with it.
- [ ] **S10. Browser tests, security, accessibility and visual check.** About 200 lines. Scenarios: all, including One user cannot change another user's data from the API. Files: `tests/e2e/settings.spec.ts`, `isolation.spec.ts`, `support/users.ts`.
  - Done when: `npm run test:e2e` green, `npm run test:db` green, `npm run check` green, keyboard-only flow works, zero console errors and policy violations, and `/ajustes` matches `docs/design.md` in light and dark at 1280 px.

## Data
**This changes the data model: it needs the owner's explicit approval before S3.** Three new tables, every one with `user_id uuid not null default auth.uid() references auth.users on delete cascade` and RLS with `using` and `with check` on `user_id = auth.uid()`:
- `accounts`: `id`, `name` (1 to 50 characters, no spaces around it), `name_key`, `opening_balance_cents bigint not null default 0`, `created_at`. Unique `(user_id, name_key)`.
- `categories`: `id`, `kind` (`expense` or `income`), `parent_id` (null for a category, the category's id for a subcategory), `name`, `name_key`, `created_at`. A subcategory must belong to the same user and have the same `kind` as its parent (composite foreign key), and goes with its parent when it is deleted. Unique name among a user's categories of the same kind, and among the subcategories of one category.
- `profiles`: `user_id` (primary key), `default_categories_added_at`. Only remembers that the default categories were given. The invoicing work item will add its own columns later.

Money is in cents (ADR-06). Nothing existing changes; no data to migrate (the local database only has fake users). The production database gets the migration with `db push` by the maintainer after the PR is merged.

## Decisions
| Decision | Discarded alternative | Reason |
|---|---|---|
| One `categories` table, subcategories are rows with `parent_id` (as `docs/architecture.md` already planned) | Separate `subcategories` table (legacy) | Later, a movement points to one `category_id`. The depth of one level is kept by the app, not by the database (accepted, see Risks). |
| `name_key` column computed by `nameKey` in `domain`, with a unique index | `unaccent` extension and an index on an expression | The comparison rule has one home (principle 3), no extension, no database function (ADR-05). |
| Default categories created by the app after sign-in, marker in `profiles` written last | Trigger on `auth.users` (legacy `handle_new_user`, `security definer`) | ADR-05 and architecture forbid `security definer` without an ADR; sign-up is closed, so the app is the only place that knows when a user first arrives. |
| Native `<dialog>` for the confirmation (ADR-18) | Base UI Dialog | No new dependency (needs approval and an ADR); the browser already traps the focus, closes with Escape and restores the focus. Revisit when a menu or a select needs Base UI. |
| Zero rows on update or delete means "ya no existe" | Pre-checking with a `select` | One round trip, and it also covers another user's row without revealing it exists. |
| Seeding at sign-in, not when opening Ajustes | Writing from a page render | A page that renders should not write; sign-in is the single moment a user first arrives. A user whose seeding failed gets it at the next sign-in. |
| Test users: A and B (existing) and a third fake user for the "new user" scenarios | Resetting A's data before each test | The defaults can only be seen once per user, so one user must stay untouched until that test. |

## Risks
- **Next 16 APIs differ from training data** (Server Actions, `revalidatePath`, cookies after sign-in). Mitigation: read the bundled guide before each file.
- **Seeding right after sign-in uses the session just created.** Whether the data layer sees the new cookies in the same request must be proven in S8; if not, seeding moves to the first load of `/ajustes` through a Server Action.
- **Depth of subcategories is not enforced by the database.** A direct API call by the user could create a third level in their own data. It cannot reach another user's data (the composite key and RLS block it), so isolation is intact. Accepted.
- **Removing accents must not remove the tilde of `ñ`.** Decomposing the text to strip accents would turn `ñ` into `n`; `nameKey` keeps the `ñ` (tested in S1).
- **A huge opening balance.** The spec gives no limit; the parser rejects amounts beyond the safe integer range with "Introduce un importe válido". Flag to the owner in Verify.
- **Duplicate-category messages are not fixed by the spec.** Proposed copy: "Ya tienes una categoría con ese nombre" and "Ya tienes una subcategoría con ese nombre en esta categoría". Confirm in S9.
- **Parallel browser tests share user A.** Mitigation: every test creates and removes its own uniquely named rows; tests that need an empty or fresh state use the third user, in series.
- **Isolation could be broken by one forgotten policy or `with check`.** Mitigation: S4 is a gate, and its mutation check (remove a `with check`, see it fail) is part of "Done when".
