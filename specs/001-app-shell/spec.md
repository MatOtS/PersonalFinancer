# Spec 001: App shell and theme

Status: approved

Split from the original spec "001 Access and app shell" (approved 2026-10-07). Requirement numbers are kept from the original spec, so they have gaps; the rest are in `specs/002-access/spec.md`.

## Context and goal
Every feature lives inside the same shell: the desktop layout, the sidebar navigation, the visual system from `docs/design.md` and the light and dark themes. This spec builds that shell and the Home page so the next specs (starting with access) have pages to protect and a layout to live in.

Until `002-access` is done, the app has no sign-in: every page is reachable without a session. This is acceptable because the app stores no data yet.

## Users
- The end user (the freelancer).

## User stories
- US-4: As the user I want a clear layout with a navigation menu so that I can move between the sections of the app.
- US-5: As the user I want the app in light or dark theme, following my system by default, so that it is comfortable to read at any time of day.

## Definitions
- **Home**: the landing page of the app. Until the dashboard spec exists, it shows a welcome and an empty state.

## Functional requirements (EARS)

### App shell
- FR-23: THE SYSTEM SHALL show every protected page inside a common layout with a fixed sidebar on the left and the page content on the right, following `docs/design.md`.
- FR-24: THE SYSTEM SHALL show in the sidebar only the sections that exist; in this version, only "Inicio".
- FR-25: THE SYSTEM SHALL mark the sidebar item of the current section as active.
- FR-27: WHEN the user opens Home, THE SYSTEM SHALL show the page title "Inicio", the greeting "Bienvenido a PersonalFinancer" and an empty state with an icon and the text "Aún no hay datos. El resumen aparecerá aquí cuando añadas tus cuentas y movimientos.", without any figures.
  - Temporary exception to `docs/design.md` (empty states include the action that fills them): this empty state has no action, because adding accounts arrives with the accounts spec. That spec adds the action here.
- FR-14: WHEN the user opens an address that does not exist, THE SYSTEM SHALL show the page "Página no encontrada" inside the app layout, with a link to Home. (Spec 002-access adds the session condition: without a session, FR-13 applies first.)

### Theme
- FR-28: THE SYSTEM SHALL offer three theme options, "Sistema", "Claro" and "Oscuro", as a three-option segmented control where the active option is highlighted and each option is one click or one key press away.
  - The theme control sits at the bottom of the sidebar (`002-access` adds the email and "Cerrar sesión" next to it, FR-26).
- FR-29: WHILE the theme option is "Sistema", THE SYSTEM SHALL follow the light or dark preference of the operating system, including changes made while the app is open.
- FR-30: WHEN the user picks a theme option, THE SYSTEM SHALL apply it immediately to the whole app, without reloading, and SHALL remember it on that browser for later visits.
- FR-31: THE SYSTEM SHALL show the chosen theme from the first paint, without a flash of the other theme.
- FR-32: THE SYSTEM SHALL apply the theme to the sign-in page as well.

FR-32 ("apply the theme to the sign-in page as well") is fulfilled by applying the theme at the root of the app; the sign-in page itself arrives with `002-access`, which verifies it there.

## Non-functional requirements
- **Security**: the app only runs scripts it serves itself, and cannot be embedded in another site. Verified with zero security policy violations in the browser console on every page.
- **User data isolation**: this spec stores no user data in the database (the theme is kept in the browser), so there is no isolation test here (constitution 5).
- **Accessibility**: navigation and theme change work with the keyboard alone; visible focus; AA contrast in both themes, as defined in `docs/design.md`.
- **Platforms**: desktop browsers, verified at 1280 px. Mobile layouts are phase 2.
- **Language**: all UI copy in Spanish (Spain).

## Edge cases
- The theme was saved on the browser but storage is unavailable (for example, cookies blocked): the app falls back to "Sistema" without failing.

## Out of scope
- Everything about signing in, sessions and signing out (`002-access`), including the email and "Cerrar sesión" in the sidebar (FR-26).
- Mobile and tablet layouts (phase 2).
- Any real section besides Home.

## Done criteria
- Every FR covered by an automated test or, for visual ones, verified in the browser at 1280 px in light and dark.
- Zero errors and zero security policy violations in the browser console.
- `npm run check` green.

## Open questions
- None.
