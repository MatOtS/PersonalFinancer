# 001: App shell and theme

Status: done
Size: feature

## Intent
Every feature lives inside the same shell: the desktop layout, the sidebar navigation, the visual system of `docs/design.md` and the light and dark themes. This work item builds that shell and the Home page so the next ones have pages to protect and a layout to live in. It is for the end user (the freelancer), who wants a clear layout to move between sections and a light or dark theme that follows the system by default.

Until `002-access` is done the app has no sign-in and every page is reachable without a session; that is acceptable because the app stores no data yet. Split from the original "001 Access and app shell" (approved 2026-10-07); the numbers in the comments below are the original requirement numbers (FR-xx), kept for traceability.

## Examples
```gherkin
# FR-23
Scenario: Pages live inside the shell
  Given the user is on any page of the app
  When the page is shown
  Then it appears inside a common layout with a fixed sidebar on the left and the page content on the right, as in `docs/design.md`

# FR-24
Scenario: The sidebar lists only the sections that exist
  Given the app has only the Home section
  When the sidebar is shown
  Then it lists only "Inicio"

# FR-25
Scenario: The current section is marked active
  Given the user is on Home
  When the sidebar is shown
  Then the "Inicio" item is marked as the current page
  And on an address that does not exist no item is marked

# FR-27
Scenario: Home shows the welcome and an empty state
  Given the user opens Home
  When the page is shown
  Then the title is "Inicio" and the greeting is "Bienvenido a PersonalFinancer"
  And an empty state shows an icon and the text "Aún no hay datos. El resumen aparecerá aquí cuando añadas tus cuentas y movimientos."
  And no figures are shown
# Temporary exception to `docs/design.md` (empty states include the action that fills them): this
# empty state has no action because adding accounts arrives with the accounts work item, which adds it here.

# FR-14
Scenario: An unknown address shows the not-found page inside the shell
  Given an address that does not exist
  When the user opens it
  Then the page "Página no encontrada" is shown inside the app layout with the sidebar visible
  And the answer has status 404
  And a link "Volver a Inicio" goes to Home
# 002-access adds the session condition: without a session, its FR-13 applies first.

# FR-28
Scenario: The theme control offers three options
  Given the user is on any page of the app
  When the sidebar footer is shown
  Then a segmented control offers "Sistema", "Claro" and "Oscuro", with the active option highlighted
  And each option is one click or one key press away

# FR-29
Scenario: Sistema follows the operating system
  Given the theme option is "Sistema" and the operating system prefers light
  When the operating system changes to dark while the app is open
  Then the app turns dark without reloading

# FR-30
Scenario: Picking a theme applies it immediately
  Given the user is on any page
  When they pick "Oscuro" or "Claro"
  Then the whole app changes at once, without reloading

# FR-30
Scenario: The chosen theme is remembered
  Given the user picked "Oscuro" on this browser
  When they open the app again later
  Then it is still dark

# FR-31
Scenario: The chosen theme is on the first paint
  Given the user picked "Oscuro" on this browser
  When a page is requested
  Then the HTML answered by the server already has the dark theme, with no flash of the other one

# FR-32
Scenario: The theme applies to every page
  Given a saved theme choice
  When any page of the app is shown, including the sign-in page that `002-access` adds
  Then it uses that theme, because the theme is applied at the root of the app

Scenario: Blocked cookies fall back to Sistema
  Given the browser blocks cookies
  When the user opens the app
  Then it renders following the operating system, without failing
```

## Non-functional
- **Security**: the app only runs scripts it serves itself and cannot be embedded in another site. Verified with zero security policy violations in the browser console on every page. The only console line allowed is the "Failed to load resource" the browser logs when a page answers an HTTP 4xx status that a requirement asks for (here, the 404 of "An unknown address..."); any 5xx, or a 4xx nobody asked for, still counts as an error.
- **User data isolation**: this work item stores no user data in the database (the theme is kept in the browser), so there is no isolation test (principle 5).
- **Accessibility**: navigation and theme change work with the keyboard alone; visible focus; AA contrast in both themes as defined in `docs/design.md`.
- **Platforms**: desktop browsers, verified at 1280 px. Mobile layouts are phase 2.
- **Language**: all UI copy in Spanish (Spain).

## Manual checks
- Visual check at 1280 px, light and dark: Home and the not-found page match `docs/design.md`.

## Out of scope
- Signing in, sessions and signing out (`002-access`), including the email and "Cerrar sesión" in the sidebar.
- Mobile and tablet layouts (phase 2).
- Any real section besides Home.

## Open questions
- None.
