# 002: Access and session

Status: done
Size: feature

## Intent
The app holds private financial data, so nothing can be seen without signing in. This work item delivers the way in (sign in, stay signed in, sign out) on top of the shell built by `001-app-shell`. It is for the end user (the freelancer), who signs in to see their data and signs out so nobody else using the computer can; the maintainer creates accounts and resets passwords outside the app.

A session stops being valid only when: the user signed out in another tab of the same browser; the maintainer changed the password, ended the sessions or deleted the account; or the session data in the browser was removed, damaged or tampered with. Closing the browser, restarting the computer or not using the app for days does not end it. Split from the original "001 Access and app shell" (approved 2026-10-07); the numbers in the comments below are the original requirement numbers, kept for traceability.

## Examples
```gherkin
# FR-1
Scenario: The sign-in page offers email, password and a button, and nothing else
  Given the user has no session
  When they open the sign-in page
  Then it has an email field, a password field and a sign-in button
  And it offers no way to create an account or recover a password

# FR-2
Scenario: Signing in lands on Home
  Given the user has no session and no page was asked for
  When they submit a valid email and password
  Then a session starts and Home is shown

# FR-2, FR-15
Scenario: Signing in returns to the page that was asked for
  Given the user asked for a protected page and was sent to the sign-in page
  When they submit a valid email and password
  Then a session starts and that page is shown

# FR-3
Scenario: Wrong credentials show one generic message
  Given the user is on the sign-in page
  When the password is wrong, or the account does not exist
  Then the message "Email o contraseña incorrectos" is shown, the same in both cases

# FR-4
Scenario: Too many attempts show the wait message
  Given the authentication service rejects the attempt because of too many recent failures
  When the user submits the form
  Then the message "Demasiados intentos. Espera unos minutos" is shown

# FR-5
Scenario: An unreachable or slow service shows the connection message
  Given the authentication service cannot be reached, or does not answer within 15 seconds
  When the user submits the form
  Then the attempt is cancelled and "No hemos podido conectar. Reintenta" is shown
  And the button and the fields are enabled again

# FR-6
Scenario: A failed attempt keeps the email and clears the password
  Given an attempt failed for any reason
  When the form is shown again
  Then the email the user typed is still there and the password field is empty

# FR-7
Scenario: A sign-in in progress shows its state
  Given the user submitted valid-looking data
  When the attempt is in progress
  Then the button is disabled and reads "Iniciando sesión…"
  And a progress indicator shows at the top of the form
  And the email and password fields are read-only
  And the in-progress state is announced to screen readers

# FR-8
Scenario: Browsers and password managers can fill the fields
  Given the user is on the sign-in page
  When a password manager or the browser fills or offers to save the credentials, or the user pastes into a field
  Then the email is recognized as an email and the password as the current password, and pasting works in both fields

# FR-9
Scenario: Empty fields are reported before sending
  Given the user left the email or the password empty
  When they submit the form
  Then nothing is sent
  And each empty field shows "Introduce tu email" or "Introduce tu contraseña" with the field in error state
  And the focus moves to the first empty field

# FR-10
Scenario: Without a session a protected page shows the sign-in page
  Given the user has no session (never had one, or signed out)
  When they open a protected page
  Then the sign-in page is shown instead, without any message

# FR-11
Scenario: With a session the sign-in page shows Home
  Given the user has a session
  When they open the sign-in page
  Then Home is shown instead

# FR-12
Scenario: A form submitted after signing in elsewhere shows Home with the existing session
  Given a sign-in form was opened without a session, and the user then signed in from another tab
  When the first tab's form is submitted with any credentials
  Then no new session starts and the typed credentials are not used
  And Home is shown with the existing session
# To use another account, the user signs out first.

# FR-13
Scenario: Without a session an unknown address shows the sign-in page
  Given the user has no session
  When they open any address of the app other than the sign-in page, existing or not
  Then the sign-in page is shown, so the app does not reveal which pages exist
# This takes precedence over the not-found page of `001-app-shell`.

# FR-15
Scenario: The page asked for is remembered
  Given the sign-in page is shown in place of a protected page
  When it is shown
  Then the page that was asked for, with its query, is remembered so signing in can return to it

# FR-16
Scenario: A return page that is not of this app is ignored
  Given the remembered page points to another site (for example "https://evil.example" or "//evil.example") or is the sign-in page itself
  When the user signs in
  Then it is ignored and Home is shown

# FR-17
Scenario: The session survives closing the browser
  Given the user signed in
  When the browser is closed and opened again
  Then the user is still signed in, until they sign out

# FR-18
Scenario: A session that ended shows the expired message on the next action
  Given the user is using the app and the session stops being valid
  When they make their next navigation or an action that needs data
  Then the sign-in page is shown with "Tu sesión ha terminado. Inicia sesión de nuevo", with no new protected content
  And what is already on screen stays until that next action
  And a tab where the user signed out, or a new tab, shows no message

# FR-19
Scenario: Sign out is available from every protected page
  Given the user is on any protected page
  When they look at the sidebar
  Then a "Cerrar sesión" action is there

# FR-20
Scenario: Signing out ends the session and shows the sign-in page
  Given the user is signed in
  When they sign out
  Then the session ends and the sign-in page is shown

# FR-21
Scenario: Signing out without the service still removes the session from the browser
  Given the authentication service cannot be reached
  When the user signs out
  Then the session is still removed from the browser and the sign-in page is shown, so no protected content stays visible

# FR-22
Scenario: The back button after signing out does not show protected content
  Given the user signed out
  When they use the browser's back button or history to return to a protected page
  Then the sign-in page is shown
  And the browser shows no stored copy of any protected page

# FR-26
Scenario: The sidebar footer shows the email, the theme control and sign out
  Given the user is signed in
  When the sidebar is shown
  Then its footer has the theme control, the user's email and the "Cerrar sesión" action

# Edge cases
Scenario: The email is normalized
  Given the email is typed with spaces around it or with capital letters
  When the user signs in
  Then it is treated as the same email

Scenario: A password is sent exactly as typed
  Given the password has spaces
  When the user signs in
  Then it is never trimmed or changed; an accidental extra space fails with the generic message

Scenario: Double click sends one attempt
  Given the user is on the sign-in page with valid data
  When they double-click the button
  Then only one attempt is sent

Scenario: A long email is cut with an ellipsis
  Given the user's email is very long
  When the sidebar footer is shown
  Then it is cut with "…" on one line, the full email shows on hover and is the text screen readers read
  And the email is not focusable, since it is not a control
```

## Non-functional
- **Security**: every protected page and data request checks the session on the server before returning anything. Verified by requesting a protected page with no cookie, a tampered cookie and an expired cookie: in all three cases the answer is a redirect to the sign-in page with no protected content. The policy of `001-app-shell` (own scripts only, no embedding) also covers the sign-in page, with zero violations in its console. The theme applies to the sign-in page too. The password is never stored or logged by the app and never appears in the URL. The session cookie is `HttpOnly`.
- **User data isolation**: this work item stores no user data in the database (the theme is kept in the browser and the session by the authentication service), so there is no isolation test. The first work item that creates a table adds it (principle 5).
- **Accessibility**: every field has a visible label; errors are announced to screen readers; the whole flow (sign in, navigate, sign out) works with the keyboard alone; visible focus; AA contrast in both themes as in `docs/design.md`.
- **Platforms**: desktop browsers, verified at 1280 px. Mobile layouts are phase 2.
- **Language**: all UI copy in Spanish (Spain).
- **Console**: zero errors and zero policy violations, except the "Failed to load resource" line for an HTTP 4xx that a scenario asks for.

## Manual checks
- Demo of the main flow: sign in, see Home, sign out, try to go back.
- Visual check at 1280 px, light and dark: the sign-in page in all its states (idle, field errors, wrong credentials, in progress, expired message) and the sidebar footer match `docs/design.md`.

## Out of scope
- Creating accounts (sign-up is closed; the maintainer creates them).
- Recovering or changing the password from the app (the maintainer resets it).
- Expiring the session by inactivity or when the browser closes.
- Locking the account after failed attempts beyond the authentication service's own limit.
- Sign-in with Google or other providers, magic links, two-factor authentication.
- Profile or settings page.
- Mobile and tablet layouts (phase 2).
- The shell, Home, the not-found page and the theme (`001-app-shell`).

## Open questions
- None.
