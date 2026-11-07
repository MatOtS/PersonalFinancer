# 003: Accounts and categories

Status: approved
Size: feature

## Intent
The user keeps their money in several places (bank accounts, cash) and spends and earns it for different reasons. Before movements can be recorded, imported or summarized, the app needs the user's own list of accounts and categories, and a place to manage them. This is the first work item that stores user data, so every record belongs to its user from the start.

## Examples
```gherkin
# Where it lives
Scenario: Settings is reached from the sidebar
  Given the user is signed in
  When the sidebar is shown
  Then it lists "Inicio" and "Ajustes"
  And choosing "Ajustes" opens the settings page, titled "Ajustes", with the sections "Cuentas" and "Categorías"
  And "Ajustes" is marked as the current page while the user is there

Scenario: Home points to the first account
  Given the user has no accounts
  When they open Home
  Then the empty state offers an action "Añadir cuenta" that opens the accounts section of settings
# Closes the temporary exception of `001-app-shell`: the empty state of Home now has its action.

# Accounts
Scenario: The user adds an account
  Given the user is on the settings page
  When they add an account named "BBVA" with an opening balance of 1.250,00 €
  Then "BBVA" appears in the accounts list showing 1.250,00 €

Scenario: The user renames an account
  Given the user has an account "BBVA"
  When they rename it to "BBVA Nómina"
  Then the list shows "BBVA Nómina" with the same opening balance

Scenario: The user corrects the opening balance of an account
  Given the user has an account "BBVA" with 1.250,00 €
  When they change its opening balance to 1.300,00 €
  Then the list shows 1.300,00 €

Scenario: The user deletes an account
  Given the user has an account "Wise"
  When they delete it and confirm
  Then "Wise" is no longer in the list

Scenario: Cancelling a deletion keeps everything
  Given the user asked to delete an account, a category or a subcategory
  When the confirmation is shown and they cancel (button "Cancelar" or the Escape key)
  Then nothing is deleted and the list is unchanged
# The confirmation has the buttons "Cancelar" and "Eliminar"; the focus starts on "Cancelar",
# so an accidental Enter does not delete.

Scenario: An account needs a name
  Given the user is adding an account
  When they leave the name empty
  Then nothing is saved and the message "Introduce un nombre" is shown

Scenario: Two accounts cannot have the same name
  Given the user has an account "BBVA"
  When they add or rename another account to "BBVA", "bbva" or " BBVA "
  Then nothing is saved and the message "Ya tienes una cuenta con ese nombre" is shown
# Names are compared ignoring capitals, accents and the spaces around them.

Scenario: Spaces around a name are removed
  Given the user is adding or renaming an account, a category or a subcategory
  When they type "  Wise  "
  Then it is saved as "Wise"

Scenario: A name has a maximum length
  Given the user is adding or renaming an account, a category or a subcategory
  When the name has 51 characters
  Then nothing is saved and the message "El nombre es demasiado largo (máximo 50 caracteres)" is shown
  And a name of exactly 50 characters is accepted

Scenario: The opening balance must be a valid amount
  Given the user is adding an account
  When the opening balance is not an amount (for example "abc") or has more than two decimals (for example "12,345")
  Then nothing is saved and the message "Introduce un importe válido" is shown

Scenario: An empty opening balance counts as zero
  Given the user is adding an account
  When they leave the opening balance empty
  Then the account is saved with 0,00 €

Scenario: The opening balance can be negative
  Given the user has a credit card or an overdraft
  When they add an account with an opening balance of -350,00 €
  Then the list shows -350,00 €

Scenario: Lists are ordered alphabetically
  Given the user has several accounts, categories or subcategories
  When the lists are shown
  Then each one is sorted by name, ignoring capitals and accents
# Categories are sorted within expenses and within income; subcategories within their category.

# Categories
Scenario: The user adds a category
  Given the user is on the settings page
  When they add a category "Alimentación" of type expense
  Then it appears in the categories list under expenses

Scenario: The user adds a subcategory
  Given the user has a category "Alimentación"
  When they add a subcategory "Supermercado" to it
  Then "Supermercado" appears under "Alimentación"

Scenario: The user renames a category or a subcategory
  Given the user has a category "Alimentación" with a subcategory "Supermercado"
  When they rename either one
  Then the list shows the new name and keeps the structure

Scenario: The user deletes a subcategory
  Given the user has a subcategory "Restaurantes"
  When they delete it and confirm
  Then it is no longer listed and its category remains

Scenario: The user deletes a category with subcategories
  Given the user has a category "Transporte" with subcategories
  When they delete the category
  Then the confirmation says how many subcategories will be deleted with it
  And once they confirm, the category and its subcategories are no longer listed

Scenario: The type of a category cannot be changed
  Given the user has a category "Alimentación" of type expense
  When they edit it
  Then they can change its name but not its type
# To change the type, the user deletes the category and adds it again.

Scenario: A category or subcategory needs a name and cannot repeat one
  Given the user is adding or renaming a category or a subcategory
  When the name is empty, or already used by another category of the same type (or another subcategory of the same category)
  Then nothing is saved and a message says why

Scenario: Changing something that no longer exists
  Given the user has the settings page open in two tabs and deleted "Wise" in one
  When they rename or delete "Wise" in the other
  Then nothing is saved, the message "Esta cuenta ya no existe" is shown and the list is updated
# Same for categories ("Esta categoría ya no existe") and subcategories ("Esta subcategoría ya no existe").

# Ownership and access
Scenario: One user cannot see another user's data
  Given user A has an account "BBVA" and user B has none
  When B opens the settings page
  Then "BBVA" is not listed

Scenario: One user cannot change another user's data
  Given user A has an account "BBVA" and a category "Alimentación"
  When B sends a request to rename or delete A's account, or to add a subcategory to A's category
  Then the request is rejected and A's data is unchanged

Scenario: The settings page needs a session
  Given the user has no session
  When they open the settings page
  Then the sign-in page is shown, as for any protected page

Scenario: A new user starts with the default categories and no accounts
  Given a user who never changed their categories or accounts
  When they open the settings page
  Then they see the default categories listed below, and an empty accounts list with an action to add the first one
  And the expense categories are, with their subcategories:
    | Category                  | Subcategories                                 |
    | Vivienda                  | Alquiler/Hipoteca, Comunidad, Mantenimiento   |
    | Suministros               | Luz, Agua, Gas, Internet                      |
    | Alimentación              | Supermercado, Restaurantes                    |
    | Transporte                | Combustible, Transporte público, Mantenimiento vehículo |
    | Ocio                      | Salidas, Viajes, Hobbies                      |
    | Suscripciones             | Streaming, Software personal                  |
    | Material/Equipo freelance | Hardware, Herramientas                        |
    | Software                  | Licencias, SaaS                               |
    | Impuestos                 | IRPF, IVA, Autónomos                          |
    | Salud                     | Seguro médico, Farmacia                       |
    | Otros                     | none                                          |
  And the income categories are Facturación, Nómina, Devoluciones and Otros ingresos, with no subcategories

Scenario: Default categories are given once and then belong to the user
  Given a user who deleted or renamed some default categories
  When they sign in again or open the settings page
  Then the default categories are not added back, and the list shows what the user left
# There is no "restore defaults" action.
```

## Non-functional
- **User data isolation**: the database itself guarantees that a user can neither read nor write another user's accounts, categories or subcategories, even if the application code failed to filter them. Verified with an isolation test between two users covering read, insert, update and delete (principle 5). The rule belongs to the data, not to the application code, so it holds whatever the application does.
- **Security**: the settings page and every request to read or change accounts and categories check the session on the server before returning or saving anything. The policy of `001-app-shell` also covers the settings page, with zero violations in its console.
- **Accessibility**: every field has a visible label; errors and the "no longer exists" messages are announced to screen readers; adding, renaming, deleting and cancelling work with the keyboard alone; the confirmation traps the focus while open and returns it to where it was; visible focus; AA contrast in both themes as in `docs/design.md`.
- **Platforms**: desktop browsers, verified at 1280 px. Mobile layouts are phase 2.
- **Language**: all UI copy in Spanish (Spain); amounts shown as `1.234,56 €`.
- **Console**: zero errors and zero policy violations, except the "Failed to load resource" line for an HTTP 4xx that a scenario asks for.

## Manual checks
- Demo of the main flow: add an account, rename it, correct its opening balance, delete it; add a category with a subcategory, delete it; cancel a deletion.
- Visual check at 1280 px, light and dark: the settings page (with data and with no accounts), the forms with their errors, the deletion confirmation and the Home empty state with its action, as in `docs/design.md`.

## Out of scope
- Movements, calculated balances, and summaries by account or category.
- Blocking the deletion of an account or category that is in use (arrives with movements).
- Changing the type of a category after creating it, and restoring the default categories.
- Manual ordering, archiving, icons or colors for accounts and categories.
- Importing or exporting accounts and categories.
- Mobile and tablet layouts (phase 2).

## Open questions
- None.
