# 005: Statement import

Status: done (verified by the owner's manual QA and the green gate, 2026-11-19)
Size: feature

## Intent
Typing every movement by hand (004) is not a habit that lasts, and the unified view is only useful if the data is up to date. The user needs to bring in many movements at once from the bank statements they download from their banks.

## Examples
Only what the owner stated so far. Everything else is an open question below and becomes a scenario once the owner decides it.

```gherkin
Scenario: The user imports movements from a bank statement
  Given the user has a bank statement downloaded from their bank
  When they import it
  Then its movements are saved as movements of the user

Scenario: The accepted file formats
  Given the user has a statement from their bank
  Then the import accepts .csv, .xlsx and .xls files
# Owner: "los mismos que legacy, .csv, .xlsx, .xls". Which banks is still open.

Scenario: The app analyzes the statement and the user confirms the columns
  Given the user chose a statement file
  When the app reads it
  Then the app analyzes the content and proposes which column is the date, which is the amount and which is the description
  And the user confirms the proposal before anything is saved
# Owner: "que la app lo analice, no 'adivine', y el usuario lo confirme".

Scenario: The user chooses the column the app cannot tell
  Given the app could not tell which column is the date, the amount or the description
       (for example two columns look like an amount, or none looks like a date)
  When the app shows the proposal
  Then the user chooses that column themselves
  And nothing is saved until every one of the three columns is chosen
# Owner: "que la elija el usuario".

Scenario: The user can correct a column the app proposed
  Given the app proposed a column as the date, the amount or the description
  When the user changes it to another column
  Then the movements are read with the column the user chose
# Owner: "sí, puede cambiar / corregir".

Scenario: The account of the imported movements
  Given the user is importing a statement
  Then the user chooses the account the movements go to, unless the file says which account it comes from
  And the user can change the account in any case
# Owner: "la cuenta la elige el usuario a menos que el archivo indique de qué cuenta viene, y de todas
# formas se deja editar". How the file says it, and how that becomes one of the user's accounts, is open.

Scenario: A negative amount is an expense and any other is an income
  Given a row of the statement
  When its amount is negative
  Then the movement is an expense
  And when it is not negative the movement is an income
# Owner: "si hay un número negativo es gasto, si no es ingreso". The movement keeps the amount positive
# and the type apart, as in 004.

Scenario: The user chooses personal or freelance and the fixed mark
  Given the user is importing a statement
  Then personal or freelance is chosen by the user
  And the fixed mark is chosen by the user
# Owner: "elige el usuario" (personal or freelance) and "usuario" (fixed). Whether it is chosen once for
# the whole statement or per movement is open.

Scenario: The category is proposed from the description
  Given a row of the statement
  When the app reads its description
  Then the app analyzes the description and proposes a category and a subcategory automatically
# Owner: "que se haga un primer análisis de la descripción del producto y se pongan automáticamente".

Scenario: The words that give a category are the user's, as in the previous app
  Given the user has words, each one tied to a category
  When the description of a row contains one of the words
  Then the category tied to that word is proposed
# Owner: "igual que en legacy, y si hay ya una lista en legacy usamos esas palabras". In the previous app
# the words are written by the user in the settings page ("Palabras clave para autocategorización"), the
# description matches when it contains the word ignoring capitals, and there is no ready-made list in the
# repository, so the user starts with none. The details are open (see the questions).

Scenario: The user selects movements with a box on the left
  Given a list of movements (the ones about to be imported)
  Then each row has a box at the left of its first column to select it
  And several rows can be selected at once
# Owner: "se elige con un cuadradito a la izquierda de la primera columna como en el explorador de
# Windows 11 o cualquier editor medianamente completo".

Scenario: The user edits several movements at once
  Given the user selected several movements
  When they change a field
  Then the change is applied to all the selected movements
# Owner: "ir uno a uno es insoportable" and "se puede editar todo". In this work item the bulk editing is
# only for the movements about to be imported ("solo de la importación"), written so that the editing of
# saved movements, when the dashboards come, can reuse it ("teniendo en cuenta que el código se va a reutilizar").

Scenario: The app remembers the columns of each bank
  Given the user confirmed the columns of a statement of a bank
  When they import another statement of the same bank
  Then the columns come already assigned as the user left them, and the user can still change them
# Owner: "sí, quiero recordar la asignación de columnas por banco (una tabla bank_profiles)", as the
# previous app did. The "bank" is the account the user picks (next scenario), and what is remembered is
# the columns and the account ("columnas y cuenta a la que va").

Scenario: The account is chosen from the user's accounts, or a new one is written
  Given the user is importing a statement
  Then the user is given the list of their accounts to choose from
  And the user can write the name of a new account, which is created in their accounts
# Owner: "se le da al usuario la lista de sus accounts creadas, y se permite escribir una cuenta nueva si
# no existe, creando esa cuenta nueva en sus accounts". It replaces the free-text bank name of the previous
# app: the account is the name the columns are remembered under.

Scenario: The new account is added with the same field as in the settings
  Given the user writes the name of a new account in the import
  Then the same add-account field of the settings page is used, with the same rules and messages as in 003
  And the user does not type an opening balance: the balance is determined by what is imported
# Owner: "se aplica lo mismo que en 003, que sea el mismo campo de añadir cuenta que en ajustes" and "el
# saldo lo va a determinar lo que se importe".

Scenario: A new account starts at zero and the imported movements make its balance
  Given the user created an account in the import
  Then the account starts with an opening balance of 0
  And its balance is the result of adding the incomes and subtracting the expenses imported into it
# Owner: "la cuenta nace con saldo inicial 0 y los movimientos importados van sumando y restando, así
# que el saldo es el resultado". The statement's own balance column, if it has one, is not read.

Scenario: A row with an amount of zero is imported
  Given a row of the statement whose amount is 0
  Then the row can be imported, as an income of 0 (0 is not negative)
# Owner: "puede importarse con importe 0".

Scenario: A statement with the sign in another column
  Given a statement whose amounts are all positive and a column says whether each row is an expense or an income
  When the app analyzes the statement
  Then the app also proposes that column, and the user confirms or corrects it like the others
  And the type of each row follows that column, not the sign of the amount
# Owner: "igual que legacy, detecta la columna".

Scenario: Which values of the sign column are understood
  Given a statement with a sign column
  When a row says out, salida, cargo, debe, debito, débito, gasto or withdrawal (or starts with one of them, ignoring capitals)
  Then the row is an expense
  And when it says in, entrada, abono, haber, credito, crédito, ingreso or deposit (or starts with one of them) the row is an income
  And when it says anything else or nothing, the sign of the amount decides, as in the scenario above
# Owner: "igual que legacy". The lists are the ones of the previous app (`parseSign`).

Scenario: Rows in a currency other than the euro are converted with an exchange rate
  Given a statement with rows in a currency other than the euro
  When the app analyzes the statement
  Then the user is told, and the app asks for one exchange rate for that currency
  And the amounts of all the rows in that currency are converted to euros with that rate
  And a row in another currency is never saved as if it were in euros

Scenario: The exchange rate is written in either direction
  Given the app asks for the exchange rate of a currency
  Then the user can write it as euros per unit of the currency (1 USD = 0,92 €) or as units of the currency per euro (1 € = 1,09 USD), and chooses which
  And the app calculates the other one and shows it to the user
# Owner: "el usuario puede escribir el tipo en cualquiera de los dos sentidos y elige cuál usar. La app
# calcula el otro", and "mostrar el otro sentido".

Scenario: The converted amount is rounded to the nearest cent
  Given a row in another currency and a valid exchange rate
  When the app converts its amount to euros
  Then the result is rounded to the nearest cent
  And when it falls exactly half a cent, it goes to the even cent (0,925 € becomes 0,92 €)
# Owner: "el redondeo al céntimo más cercano, sí" and "va al céntimo par (0,92 €)".

Scenario: The type of a row in another currency is decided like any other row
  Given a row in a currency other than the euro
  Then it is an expense or an income by the sign of its original amount, or by the sign column if the statement has one
  And the conversion only changes the amount, never the type
# Owner: "sí, igual, por el signo o columna con signo".

Scenario: An exchange rate that is not valid
  Given the app asks for the exchange rate of a currency
  When the user leaves it empty, writes 0 or a negative number, or writes something that is not a number
  Then the message "Introduce un tipo de cambio válido" is shown in that field
  And the user cannot continue until it is corrected
# Owner: "si está vacío, es 0 o negativo, un mensaje de error en ese campo, como el resto de formularios
# (por ejemplo 'Introduce un tipo de cambio válido'), y no se puede continuar hasta corregirlo". The owner
# named empty, 0 and negative; "not a number" was added here by the same rule, to be confirmed.
# Owner: "no, que no la guarde como si fuera en euros, que pida el tipo de cambio de esa moneda y haga
# el cálculo" and "un tipo de cambio para esa moneda" (one rate per currency, for the whole statement).
# The app stores plain euro amounts.

Scenario: The user reviews the movements before saving them
  Given the user confirmed the columns and the account of a statement
  Then the app shows the list of the movements of the statement, already classified (type, account, category)
  And the user can review them, edit them in bulk, leave rows out and then confirm
  And nothing is saved until the user confirms
# Owner: "sí: una lista, con las filas ya clasificadas (tipo, cuenta, categoría), donde el usuario revisa,
# edita en bulk, deja fuera filas y luego confirma. Es lo que hacía legacy".

# From here on: "igual que legacy" (owner: "copia todo como lo hace legacy, y luego itero, todo lo que
# esté evidente en legacy hacelo igual"). Each scenario below states what the previous app does.

Scenario: A row is in another currency when its currency column says so
  Given a statement with a column named divisa, moneda or currency
  When a row has a value there that is not EUR or €
  Then that row is in another currency
  And a statement with no such column has all its rows taken as euros
# Owner: "igual que legacy".

Scenario: The statement is read with its title rows and its content decides the format
  Given a statement with title, account or balance rows above the table
  Then the app finds the header row among them
  And the format is recognized by the content of the file and not only by its extension
# Previous app: finds the header row by its words, and trusts the content over the extension.

Scenario: The statement is read in the browser and not stored
  Given the user chose a statement file
  Then the file is read in the browser, only the rows the user confirms are saved, and the file is never stored

Scenario: Personal or freelance and the fixed mark are chosen for the whole statement and can be changed per row
  Given the user is importing a statement
  Then the user chooses personal or freelance once for the whole statement, and the fixed mark once for the whole statement
  And each movement of the list can be changed afterwards, one by one or in bulk
# Previous app: one "Tipo" for the whole import (no fixed mark in the import). The fixed mark is the owner's.

Scenario: Possible duplicates are marked and left out by default
  Given the user has movements saved, and the statement has a row with the same date, description and amount as one of them
  Then the row is shown as a possible duplicate, dimmed and not included by default
  And the user can include it
# Previous app: compares date, description and amount with the saved movements in the dates of the statement.

Scenario: Rows without a valid date are left out and the user is told how many
  Given a statement with rows whose date is not valid
  Then those rows are left out of the list
  And the message "Se descartaron N filas sin fecha válida" is shown (N is how many)
# Previous app: the same, and it also discarded rows with an amount of 0, which here are imported (owner).

Scenario: A file with no movements, or with no usable rows
  Given the user chose a file with no movements, or whose rows are all unusable
  Then "No se encontraron movimientos en el archivo." or "Ninguna fila quedó utilizable: revisa que las columnas de fecha e importe sean las correctas." is shown
  And nothing is saved

Scenario: A statement has a size limit
  Given a statement
  Then a sheet with more than 1.048.576 rows or 16.384 columns is not read
# Previous app: those are the limits of an Excel sheet, set to protect the browser. No limit of file size.

Scenario: The user is told how many movements were imported
  Given the user confirmed the list
  When the movements are saved
  Then the message "Se importaron N movimientos." is shown (N is how many)
  And the form is left empty to import another statement
# Previous app: the same.

Scenario: The import has its own screen
  Given the user is signed in
  Then the import is a screen of its own, reachable from the navigation of the app
# Previous app: its own screen, "Importar", in the navigation.

Scenario: The words are added in the settings and the first match gives the category
  Given the user adds a word and a category in the settings page
  When a description contains words of several rows
  Then the first one found gives the category
  And when no word matches the movement stays without category
# Previous app: add only, in the settings; no change or delete of a word.
```

## Non-functional
- **User data isolation** (principle 5): the database itself guarantees that a user can neither read, change nor import movements into another user's data, verified with a test between two users.
- **Bank files** (principle 5): the statement file is not stored; no real financial data in the repository, the tests or the logs.
- **Language** (principle 6): UI copy in Spanish (Spain), amounts as `1.234,56 €`, dates as `dd/mm/yyyy`.
- **Console**: zero errors and zero policy violations.
- Other measurable requirements (accessibility, size of statements, platforms) to be set with the open questions.

## Manual checks
To be listed once the scenarios are decided.

## Out of scope
- Viewing, editing and deleting saved movements: they are done when the dashboards come (owner, 2026-11-19).
- Changing or deleting what is remembered of an account, and the bank changing its file format: backlog item 31 (owner, 2026-11-19).
- Bulk editing of saved movements: it comes with the dashboards, reusing what is written here for the import (owner, 2026-11-19).
- Others to be listed with the owner.

## Open questions
Resolved by the owner's instruction "imitar lo que hace legacy" (2026-11-19), recorded here:
- Taking code from `legacy/`: the owner said "copia todo como lo hace legacy". The readers of the three formats, the column detection and the rules of the previous import may be ported as the starting point (this line is the spec saying so, as `CLAUDE.md` asks).
- The file saying which account it comes from: not done, as in the previous app (the user always chooses the account). Left for later.
- The converted amount keeps only the amount in euros (no data change); the original amount and currency are not kept.
- The words: only added, as in the previous app (no change or delete); a word is tied to a category.
- Bulk edit: a box in the header selects all rows, as in a file explorer (the owner's own comparison); every field of the list can be edited.
- Dependencies and data changes this work item needs are listed in `work/DECISIONS-PENDING.md` and wait for the owner (they are critical).
