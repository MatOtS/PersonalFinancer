# Spec 002: Access and session

Status: approved

Split from the original spec "001 Access and app shell" (approved 2026-10-07). Requirement numbers are kept from the original spec, so they have gaps; the shell and theme requirements are in `specs/001-app-shell/spec.md`, which this spec builds on.

## Context and goal
The app holds private financial data, so nothing can be seen without signing in. This spec delivers the way in (sign in, stay signed in, sign out) on top of the shell built by `001-app-shell`.

## Users
- The end user (the freelancer), who signs in to use the app.
- The maintainer, who creates accounts and resets passwords outside the app.

## User stories
- US-1: As the user I want to sign in with my email and password so that only I can see my financial data.
- US-2: As the user I want to stay signed in until I sign out so that I don't have to type my password every time I open the app.
- US-3: As the user I want to sign out so that nobody else using the computer can see my data.

## Definitions
- **Protected page**: any page of the app except the sign-in page.
- **Session**: the state of being signed in on a given browser.
- **Session stops being valid**: only in these cases: (1) the user signed out in another tab or window of the same browser; (2) the maintainer changed the user's password or ended the user's sessions from the authentication service; (3) the maintainer deleted the account; (4) the session data in the browser was removed, damaged or tampered with. Closing the browser, restarting the computer or not using the app for days does not end it (FR-17).
- **Home**: the landing page after signing in (built by `001-app-shell`).

## Functional requirements (EARS)

### Sign in
- FR-1: THE SYSTEM SHALL offer a sign-in page with an email field, a password field and a sign-in button, and no option to create an account or recover a password.
- FR-2: WHEN the user submits a valid email and password, THE SYSTEM SHALL start a session and show the protected page the user originally asked for (see FR-10), or Home if there was none.
- FR-3: IF the email or the password is wrong, or the account does not exist, THEN THE SYSTEM SHALL show the message "Email o contraseña incorrectos", without revealing which of them failed.
- FR-4: IF the authentication service rejects the attempt because of too many recent failed attempts, THEN THE SYSTEM SHALL show the message "Demasiados intentos. Espera unos minutos".
- FR-5: IF the authentication service cannot be reached, or does not answer within 15 seconds, THEN THE SYSTEM SHALL cancel the attempt, show the message "No hemos podido conectar. Reintenta" and enable the button and the fields again.
- FR-6: IF a sign-in attempt fails for any reason, THEN THE SYSTEM SHALL keep the email the user typed and clear the password field.
- FR-7: WHILE a sign-in attempt is in progress, THE SYSTEM SHALL disable the sign-in button, change its text to "Iniciando sesión…", show a progress indicator at the top of the sign-in form, keep the email and password fields read-only, and announce the in-progress state to screen readers.
- FR-8: THE SYSTEM SHALL let browsers and password managers recognize, fill in and offer to save the email and the current password, and SHALL allow pasting into both fields.
- FR-9: IF the email or the password field is empty when submitting, THEN THE SYSTEM SHALL not send the attempt, SHALL show under each empty field its message ("Introduce tu email" or "Introduce tu contraseña") with the field in error state, and SHALL move the focus to the first empty field.

### Session
- FR-10: WHILE there is no session, WHEN the user opens any protected page, THE SYSTEM SHALL show the sign-in page instead, without any message. This applies when there was never a session on that browser or the user signed out; when a session existed and stopped being valid, FR-18 applies instead.
- FR-11: WHILE there is a session, WHEN the user opens the sign-in page, THE SYSTEM SHALL show Home instead.
- FR-12: WHILE there is a session, WHEN a sign-in form that was already open (for example, in another tab) is submitted, THE SYSTEM SHALL not start a new session nor use the typed credentials, and SHALL show Home with the existing session. To use another account, the user signs out first.
- FR-13: WHILE there is no session, WHEN the user opens any address of the app other than the sign-in page, whether it exists or not (this takes precedence over FR-14 of 001-app-shell), THE SYSTEM SHALL show the sign-in page, so it does not reveal which pages exist.
- FR-15: WHEN the sign-in page is shown in place of a protected page (FR-10, FR-18), THE SYSTEM SHALL remember that page so FR-2 can return to it.
- FR-16: IF the remembered page is not a page of this app (for example, an address on another site), or is the sign-in page itself, THEN THE SYSTEM SHALL ignore it and use Home.
- FR-17: THE SYSTEM SHALL keep the session after the browser is closed and reopened, until the user signs out.
- FR-18: IF the session stops being valid while the user is using the app, THEN, on the user's next navigation or action that needs data, THE SYSTEM SHALL show the sign-in page with the message "Tu sesión ha terminado. Inicia sesión de nuevo", without showing any new protected content. The app does not check the session in the background; what is already on screen stays until that next action.

### Sign out
- FR-19: THE SYSTEM SHALL offer a "Cerrar sesión" action available from every protected page.
- FR-20: WHEN the user signs out, THE SYSTEM SHALL end the session and show the sign-in page.
- FR-21: IF the authentication service cannot be reached when signing out, THEN THE SYSTEM SHALL still remove the session from the browser and show the sign-in page, so no protected content stays visible on that browser.
- FR-22: WHEN the user has signed out and uses the browser's back button or history to return to a protected page, THE SYSTEM SHALL show the sign-in page, and the browser SHALL not show a stored copy of any protected page.

### App shell (additions to 001-app-shell)
- FR-26: THE SYSTEM SHALL show at the bottom of the sidebar the email of the signed-in user, the theme control and the "Cerrar sesión" action.

## Non-functional requirements
- **Security**:
  - Every protected page and every data request checks the session on the server before returning anything. Verified by requesting a protected page (a) without a session cookie, (b) with a tampered session cookie and (c) with an expired session cookie: in all three cases the response is a redirect to the sign-in page and contains no protected content.
  - The security policy set up in `001-app-shell` (only own scripts, no embedding) also covers the sign-in page: zero violations in its console.
  - The theme (FR-32 of 001-app-shell) applies to the sign-in page as well.
  - The password is never stored or logged by the app, and never appears in the URL.
- **User data isolation**: this spec stores no user data in the database (the theme is kept in the browser and the session by the authentication service), so there is no isolation test here. The first spec that creates a table adds it (constitution 5).
- **Accessibility**: every field has a visible label; errors are announced to screen readers; the whole flow (sign in, navigate, sign out) works with the keyboard alone; visible focus; AA contrast in both themes, as defined in `docs/design.md`.
- **Platforms**: desktop browsers, verified at 1280 px. Mobile layouts are phase 2.
- **Language**: all UI copy in Spanish (Spain).

## Edge cases
- Email typed with spaces before or after it, or with capital letters: it is treated as the same email.
- Password with spaces: it is sent exactly as typed, never trimmed or changed. An accidental extra space makes the attempt fail with the generic message of FR-3.
- Several tabs open: signing out in one tab ends the session in all of them on their next action.
- The user double-clicks the sign-in button: only one attempt is sent.
- Very long email in the sidebar: it is cut with "…" to fit on one line; the full email is shown on mouse hover and is always the text read by screen readers. The email is not focusable, since it is not a control.

## Out of scope
- Creating accounts (sign-up is closed; the maintainer creates them).
- Recovering or changing the password from the app (the maintainer resets it).
- Expiring the session by inactivity or when the browser closes.
- Locking the account after failed attempts beyond the authentication service's own limit.
- Sign-in with Google or other providers, magic links, two-factor authentication.
- Profile or settings page.
- Mobile and tablet layouts (phase 2).
- The shell, Home, the not-found page and the theme (`001-app-shell`).

## Done criteria
- Every FR covered by an automated test or, for visual ones, verified in the browser at 1280 px in light and dark.
- Demo of the main flow: sign in, see Home, sign out, try to go back.
- Zero errors and zero security policy violations in the browser console.
- `npm run check` green.

## Open questions
- None.
