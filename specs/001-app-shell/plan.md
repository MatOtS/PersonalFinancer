# Plan 001: App shell and theme

Spec: `specs/001-app-shell/spec.md`

Split from the plan of the original spec "001 Access and app shell" (approved 2026-10-07). Decisions are unchanged; the access part is in `specs/002-access/plan.md`.

## Summary
The visual system from `docs/design.md` becomes CSS tokens for both themes plus a handful of hand-written components; the shell (sidebar, Home, not-found inside the shell) is a route group every later page lives in. The theme lives in a cookie read on the server, so the first paint already has the right theme without any script. `src/proxy.ts` starts here with the per-request nonce and the security policy; `002-access` adds the session check to it.

## Files
| File | Action | Responsibility | FR |
|---|---|---|---|
| `src/domain/theme.ts` (+ test) | create | Parse and validate the theme preference | FR-28 to FR-31, edge case |
| `src/lib/security-headers.ts` (+ test) | create | Build the CSP string from a nonce | NFR security |
| `src/proxy.ts` | create | Nonce and CSP on every page | NFR security |
| `next.config.ts` | modify | Static security headers | NFR security |
| `src/app/globals.css` | modify | Design tokens for both themes, base styles, focus ring, reduced motion | FR-23, FR-29, FR-31, FR-32, NFR accessibility |
| `src/app/layout.tsx` | modify | Read the theme cookie, set `data-theme` on `<html>`, Spanish `lang` | FR-29 to FR-32 |
| `src/app/page.tsx` | delete | Replaced by Home inside the app group | FR-27 |
| `src/app/(app)/layout.tsx` | create | Shell with sidebar and content area | FR-23 |
| `src/app/(app)/page.tsx` | create | Home | FR-27 |
| `src/app/(app)/[...missing]/page.tsx` | create | Catch-all that calls `notFound()` | FR-14 |
| `src/app/(app)/not-found.tsx` | create | "Página no encontrada" inside the shell | FR-14 |
| `src/components/ui/button.tsx` | create | Button variants from design.md | FR-14 |
| `src/components/ui/segmented-control.tsx` | create | Accessible radio group styled as pills | FR-28 |
| `src/components/ui/empty-state.tsx` | create | Icon, text, optional action | FR-27 |
| `src/components/shell/sidebar.tsx` | create | Brand, navigation, footer slot | FR-23 to FR-25 |
| `src/components/shell/nav-item.tsx` | create | Link with active state | FR-24, FR-25 |
| `src/components/shell/theme-control.tsx` | create | Theme segmented control (client) | FR-28 to FR-30 |
| `playwright.config.ts`, `tests/e2e/shell.spec.ts`, `tests/e2e/theme.spec.ts` | create | Browser tests | See Tests |
| `package.json` | modify | `@phosphor-icons/react`, `@playwright/test`, `test:e2e` script | - |
| `src/domain/example.test.ts` | delete | Foundation placeholder | - |
| `docs/architecture.md` | modify | ADR-15 (icons), ADR-16 (theme cookie) | - |

## Logic
- `parseThemePreference(raw: string | undefined): "system" | "light" | "dark"`: `"light"` and `"dark"` pass; anything else, including undefined, is `"system"`. FR-28, FR-31, edge case.
- `buildContentSecurityPolicy(nonce: string, isDev: boolean): string`: the policy from the Next.js guide (`node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`): scripts and styles only with the nonce or from the app itself, `'strict-dynamic'`, `'unsafe-eval'` only in development, `frame-ancestors 'none'`, `upgrade-insecure-requests` only outside development. NFR security.

## Algorithm
Proxy, for every request except static assets and prefetches (matcher from the Next guide):

```
nonce = random base64
csp = buildContentSecurityPolicy(nonce, isDev)
forward the request with headers x-nonce and Content-Security-Policy
set Content-Security-Policy on the response
```

Theme change (client, `theme-control`):

```
on option change:
  if option is "system": remove data-theme from <html>; delete the cookie
  else: set data-theme = option on <html>; write cookie theme=option (1 year, Path=/, SameSite=Lax)
```

Root layout (server): `data-theme` = `parseThemePreference(cookie)` unless it is `"system"`, in which case the attribute is omitted and CSS follows `prefers-color-scheme`.

## UI
- **Shell**: sidebar 240 px fixed on `surface` with `border` on the right; brand at the top; navigation with the single item "Inicio" (house icon), active with `accent-soft` and `accent`; footer separated by a `border` line with the theme segmented control. Content area on `bg`, max width 1280 px, gutter 32 px. FR-23 to FR-25, FR-28.
- **Home**: `h1` "Inicio", greeting in `body` `text-muted`, card with the empty state (icon tile, text, no action, as the spec's temporary exception). FR-27.
- **Not found** (inside the shell): `h1` "Página no encontrada", short text, secondary button "Volver a Inicio". FR-14.
- **Theme control**: three native radio inputs ("Sistema", "Claro", "Oscuro") styled as a segmented control; arrow keys move between options. FR-28 to FR-30.
- **Tokens**: CSS custom properties with `light-dark()` and `color-scheme`, overridden by `:root[data-theme="light"|"dark"]`, as in `prototype/index.html`; exposed to Tailwind through `@theme`. Typography, radii, spacing and focus ring exactly as `docs/design.md`. Icons from Phosphor, regular weight, 20 px.

## Data
- No tables, no migrations.
- Theme preference: cookie `theme` (`light` | `dark`; absent means system), `Path=/`, `SameSite=Lax`, one year. Not `HttpOnly`, because the client writes it. Not sensitive.

## Decisions
| Decision | Discarded alternative | Reason |
|---|---|---|
| Theme in a cookie read by the server (ADR-16) | `localStorage` plus an inline script before paint | No inline script to allow in the CSP, and the first paint is already correct (FR-31). If cookies are blocked, the theme stays on "Sistema" (edge case). |
| Native radio inputs for the theme control | Base UI RadioGroup / ToggleGroup | Native radios already give keyboard and screen reader behaviour; no dependency needed yet (constitution 1). |
| Catch-all `(app)/[...missing]` calling `notFound()` | Root `app/not-found.tsx` | The root not-found renders outside the shell; FR-14 asks for it inside the layout. |
| Strict CSP with nonce for scripts **and** styles | `style-src 'unsafe-inline'` (legacy) | Legacy needed it only for Recharts; there are no charts yet. Revisit in the dashboard spec. |
| Phosphor Icons (ADR-15) | Hand-drawn SVGs | Consistent set already chosen in the architecture stack; tree-shaken per icon. |
| Playwright now | Manual browser checks only | Constitution 4 and ADR-08; the theme and shell behaviour are browser behaviour. |

## Tests
| What is tested | Type | FR |
|---|---|---|
| `parseThemePreference`: valid, unknown, undefined | unit | FR-28, FR-31 |
| `buildContentSecurityPolicy`: nonce present, no `unsafe-inline`, dev-only `unsafe-eval`, `frame-ancestors 'none'` | unit | NFR security |
| Home inside the shell: sidebar, single item "Inicio" active, exact texts, no figures | e2e | FR-23 to FR-25, FR-27 |
| Unknown address → "Página no encontrada" inside the shell, link to Home works | e2e | FR-14 |
| Theme: three options, immediate change without reload, cookie written, reload keeps it, server HTML carries `data-theme` | e2e | FR-28, FR-30, FR-31 |
| "Sistema" follows emulated `prefers-color-scheme`, including a change while open | e2e | FR-29 |
| Cookies blocked: app renders in "Sistema" without errors | e2e | Edge case |
| Theme applied from the root layout (any page, including future ones) | e2e | FR-32 |
| CSP header with nonce on every page; zero CSP violations in the console on Home and not-found | e2e | NFR security |
| Keyboard only: navigate and change theme | e2e | NFR accessibility |
| Visual check at 1280 px, light and dark: Home, not-found | visual (Chrome DevTools MCP) | FR-23 to FR-28 |

## Risks
- **Next 16 APIs differ from training data** (`proxy.ts`, cookies, route groups). Mitigation: read the bundled guide before each file.
- **Nonce CSP breaks something silently** (fonts, Next runtime, dev overlay). Mitigation: console check for violations in the tests; `'unsafe-eval'` only in development.
- **Reading the theme cookie makes every page dynamic.** Accepted: the nonce already requires dynamic rendering.
