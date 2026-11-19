# 004: Quick movement entry

Status: done
Size: feature

## Intent
The user has accounts and categories (003) but no money moving through them yet. They need a fast way to record by hand an expense or an income as it happens, against one of their accounts and a category, so the app starts to hold real movements. It is the first work item that stores movements, so each one belongs to its user from the start.

## Examples
```gherkin
# Where it lives
Scenario: The form opens from any screen
  Given the user is signed in and on any page of the app
  When they press the button to add a movement, placed at the top of the screen, on the right
  Then a form opens, of generous size, to register a movement
# Owner: "un botón que abre un form, con un tamaño generoso, desde cualquier pantalla, y que el botón
# esté en alguna parte superior de la pantalla, esquina derecha por ejemplo".

# What the form asks for
Scenario: The form asks for all the data of a movement
  Given the form is open
  Then it asks for: whether it is an expense or an income, the amount, the date, a description,
       the account, the category, the subcategory, whether it is personal or freelance,
       and whether it is fixed (a fixed expense or a fixed income)
# Owner: "todos los datos del anterior" (the data the previous app asked for). Which ones are
# required, their default values and their rules are still to be decided (see Open questions).

Scenario: Which data is required
  Given the form is open
  Then the required data are: the type (expense or income), the amount, the date, the account
       and whether it is personal or freelance
  And the description, the category, the subcategory and the fixed mark are optional
# Owner: "obligatorios son: tipo, importe, fecha (selecciona por default la de hoy), cuenta,
# personal o freelance". The optional ones are the rest of the data the owner asked for.

Scenario: The lists of the form are ordered alphabetically
  Given the user has several accounts, categories or subcategories
  When the form shows them
  Then each list is sorted by name, ignoring capitals and accents
# Owner: "alfabéticamente" (as in the settings page). The categories are sorted as one list, and the
# subcategories within their category.

Scenario: The date starts as today
  Given the form is opened
  Then the date is today's date

Scenario: Everything else starts empty
  Given the form is opened
  Then the type, the account, personal or freelance, the amount, the description, the category and
       the subcategory start empty, and the fixed mark starts unmarked
# Owner: "todos vacíos". The user has to choose the type, the account and personal or freelance.

Scenario: A user with no accounts is taken to create one
  Given the user has no accounts
  When they press the button to add a movement
  Then the form opens with a notice that they have no accounts
  And the notice gives a way to go and create one
# Owner: "le lleva a crear una cuenta" and "se abre primero con el aviso". The wording of the notice
# and where the way to create the account leads are to be fixed when mapping (the accounts section of settings).

Scenario: The amount must be a valid amount
  Given the user is registering a movement
  When the amount is not an amount (for example "abc"), is negative (for example "-5")
       or has more than two decimals (for example "12,345")
  Then nothing is saved and the message "Introduce un importe válido" is shown
# Owner: "negativo no, hay tipo ingreso y gasto y van por separado, no tiene sentido el negativo",
# "2 máximo" (decimals), "lo mismo" (the same rules and message as the opening balance of an account).

Scenario: The amount has a maximum
  Given the user is registering a movement
  When the amount is greater than 999.999.999,99 €
  Then nothing is saved and the message "El importe es demasiado grande" is shown
  And an amount of exactly 999.999.999,99 € is accepted
# Owner: "el máximo es 999.999.999,99 €" and "El importe es demasiado grande".

Scenario: An amount of zero is accepted
  Given the user is registering a movement
  When the amount is 0
  Then the movement is accepted
# Owner: "importe 0 se puede".

Scenario: A required data is missing
  Given the user is registering a movement
  When they save leaving empty the type, the amount, the account or personal or freelance
  Then nothing is saved
  And each field that is wrong shows its own message, in the style of the accounts form ("Introduce un nombre"),
       except personal or freelance, which shows no text and only marks its radio buttons in red
  And what the user had already written is kept
# Owner: "uno por campo, parecido a las cuentas", "se conserva lo ya escrito", "mensaje de error igual
# que el resto". Messages (owner): type "Elige tipo de movimiento", amount empty "El importe no puede estar vacío",
# account "Debes elegir una cuenta". Personal or freelance (owner): "sin mensaje, solo marca en rojo los radios".

Scenario: A subcategory needs its category
  Given the user is registering a movement
  Then a subcategory can only be chosen once its category is chosen, and it belongs to that category
# Owner: "no se debería poder ni crear una subcategoría sin categoría".

Scenario: Changing the category clears the subcategory
  Given the user chose a category and one of its subcategories (for example "Alimentación" and "Supermercado")
  When they change the category in the form
  Then the subcategory is cleared
# Owner: "si el usuario elige Alimentación y Supermercado y luego cambia la categoría, la subcategoría se
# quita" (in the form to register a movement, not in the settings page).

Scenario: A category alone is enough
  Given the user chose a category that has subcategories
  When they save without choosing a subcategory
  Then the movement is saved with the category and no subcategory
# Owner: "lo otro sí" (a category without subcategory) and "no es obligatorio escoger una subcategoría".

Scenario: The category list does not depend on the type
  Given the user is registering a movement
  Then the category list shows all the categories, of expense and of income
  And changing the type does not change the category already chosen
# Owner: "muestra todas" and "se mantiene". So an expense can be saved with an income category and
# the other way round. Reason (owner): "si me hacen un bizum por 'cena anoche' yo lo pondría con ese
# tipo", an income under "Alimentación".

Scenario: The fixed mark and personal or freelance are only stored
  Given the user is registering a movement of any type
  Then the fixed mark can be set on an expense and on an income
  And the fixed mark and personal or freelance are saved with the movement and nothing else is done with them
# Owner: "sí, puede ser un ingreso fijo también". Using them (fixed expenses, the freelance side of the
# dashboard) belongs to later work items.

Scenario: Saving a movement
  Given the user filled the form with valid data
  When they save
  Then the movement is saved for that user
  And the form closes
  And a visual confirmation (a pop-up in some part of the page) tells them it was saved with the message "Movimiento añadido con éxito"
# Owner: "una confirmación visual y cierra el formulario, algún pop-up por alguna parte de la pág";
# "solo 1, 'movimiento añadido con éxito'" (the same message for an expense and an income).
# Where the pop-up appears is to be fixed when mapping.

Scenario: Closing the form discards what was typed
  Given the form is open and the user has typed something
  When they close it without saving (Cancelar, the Escape key or a click outside)
  Then nothing is saved and what was typed is discarded without asking
  And the next time the form opens it starts as described above (today's date, the rest empty)
# Owner: "se descarta lo escrito sin preguntar".

Scenario: Any date is accepted
  Given the user is registering a movement
  When the date is in the future or in the past (no limit)
  Then the movement is accepted
  And the date is shown as dd/mm/yyyy
# Owner: "se puede fecha futura, se puede fecha pasada, la del proyecto dd/mm/yyyy".
# Owner: the date is chosen with a date input that opens a calendar, so an impossible date
# (for example 31/02) cannot be typed.

Scenario: The date is never left empty
  Given the user is registering a movement
  When they clear the date
  Then the date goes back to today's date without any message
# Owner: "que vuelva a la fecha de hoy sin avisar, esto si no podemos evitar que se borre la fecha".
# If the date cannot be prevented from being cleared, this is what happens. Whether it can be
# prevented is to be checked when mapping.

Scenario: The description has a maximum length
  Given the user is registering a movement
  When the description has more than 200 characters
  Then nothing is saved and the message "La descripción es demasiado larga (máximo 200 caracteres)" is shown
  And a description of exactly 200 characters is accepted
# Owner: "ponele un máximo lógico... 200-300 o menos, lo que sea lógico"; then "confirmo los 200 caracteres".
# The wording follows the name message of the accounts.

Scenario: Spaces around the description are removed
  Given the user is registering a movement
  When they type "  cena anoche  " as the description
  Then it is saved as "cena anoche"
# Owner: "se quitan los espacios sobrantes".

Scenario: Saving with an account or a category that no longer exists
  Given the user has the form open and the account, the category or the subcategory they chose was deleted (for example in another tab)
  When they save
  Then nothing is saved and the message "Esta cuenta ya no existe", "Esta categoría ya no existe" or "Esta subcategoría ya no existe" is shown
  And the form stays open, keeps what was typed and leaves empty only the choice that no longer exists, so the user can choose another and save
# Owner: "hacemos lo mismo, sí" (as in the settings page); "se queda abierto: conserva lo escrito y deja vacía solo la elección que ya no existe, para que el usuario elija otra y guarde".

Scenario: Saving twice in a row saves one movement
  Given the user filled the form with valid data
  When they send it twice before it closes (a double click, a slow connection or Enter pressed twice)
  Then only one movement is saved
# Owner: "debe guardar 1 solo movimiento". Two forms opened one after the other are two movements.

# What happens to the movements when something they use is deleted (settings page)
Scenario: Deleting an account deletes its movements
  Given the user has an account with movements
  When they delete the account and confirm
  Then the account and all its movements are no longer listed or stored
# Owner: "los movimientos se borran cuando se borra su cuenta". Added to this spec on 2026-11-17 with the owner's approval.

Scenario: The account deletion says how many movements go with it
  Given the user asked to delete an account that has movements
  Then the confirmation says how many movements will be deleted with it, in the form
       'Se eliminará la cuenta "X" que contiene N movimientos. Esta acción no se puede deshacer.'
       ("1 movimiento" when it is one)
  And an account with no movements keeps the confirmation it has today
# Owner: "sí, debe avisar cuántos movimientos se borran, que se cambie el código". It changes the
# confirmation built in 003. Owner's wording: "Se eliminara "X" cuenta que contiene N movimiento/s" (cleaned up
# here to correct Spanish and with the closing sentence of the other confirmations; to be confirmed).

Scenario: Deleting a category or a subcategory keeps the movements
  Given the user has movements with a category or a subcategory
  When they delete that category (its subcategories go with it) or only that subcategory
  Then the movements are kept
  And they lose the category and the subcategory that were deleted
# Owner: "no [se borran] su categoría o subcategoría, simplemente se les quita esa cat o subcat".

# Ownership and access
Scenario: The form and saving need a session
  Given the user has no session
  When they try to open the app or to save a movement
  Then the sign-in page is shown, as for any protected page
# Owner: "sí, igual" (as in the settings page).

Scenario: One user cannot use another user's data in a movement
  Given user A has an account "BBVA" and a category "Alimentación"
  When user B sends a request to save a movement with A's account, category or subcategory
  Then the request is rejected and nothing is saved

Scenario: One user cannot see or change another user's movements
  Given user A has saved movements
  When user B tries to read, change or delete them
  Then the request is rejected and A's movements are unchanged
```

## Non-functional
- **User data isolation**: the database itself guarantees that a user can neither read nor write another user's movements, and cannot attach a movement to another user's account, category or subcategory, even if the application code failed to filter them. Verified with an isolation test between two users covering read, insert, update and delete (principle 5).
- **Security**: the form and every request to save a movement check the session on the server before saving anything.
- **Accessibility**: every field has a visible label; the form opens, is filled, saved and closed with the keyboard alone; the focus stays inside the form while it is open and returns to the button that opened it when it closes; visible focus; AA contrast in both themes as in `docs/design.md`.
- **Platforms**: desktop browsers, verified at 1280 px. Mobile layouts are phase 2.
- **Language**: all UI copy in Spanish (Spain); amounts shown as `1.234,56 €` and dates as `dd/mm/yyyy`.
- **Console**: zero errors and zero policy violations.

## Manual checks
- Demo of the main flow: open the form from two different pages, register an expense and an income, see the confirmation, and cancel one form without saving.
- Visual check at 1280 px, light and dark: the button at the top, the open form (empty, with errors, and with the no-accounts notice) and the confirmation pop-up, as in `docs/design.md`.

## Out of scope
- Viewing, editing or deleting saved movements (there is no movements list yet).
- Calculated balances and summaries by account or category.
- Importing movements from a bank statement.
- Recurring movements or any use of the fixed mark (fixed expenses are a later work item).
- Attaching files or receipts.
- Mobile and tablet layouts (phase 2).

## Open questions
- [NEEDS CLARIFICATION] Where the confirmation pop-up appears (it does not change behavior; to fix when mapping).
- [NEEDS CLARIFICATION] Exact place of the button: "top, for example the right corner"; it must be fixed when the layout is mapped (it does not change behavior).
