# 011: Home dashboard

Status: done (verified by the owner's manual QA and the green gate, 2026-11-19)
Size: feature

## Intent
The user wants one place that shows how the money moves: totals, where it goes, the balance of each account and the movements, with the owner's addition that movements can be seen, edited and deleted here. Model: the previous app, backlog item 5.

## Examples
```gherkin
Scenario: The home shows the totals of a period
  Given the user has movements
  When they open the home
  Then it shows the incomes, the expenses and the balance (incomes minus expenses) of the period
  And the average income and the average expense of the period
# The period starts as the last month; the previous app chose it with presets or a from and a to date.

Scenario: The user chooses the period
  Given the home
  Then the user can choose a preset or a from and a to date, and everything on the page follows the period

Scenario: Expenses by category
  Given the period has expenses
  Then a chart shows the expenses by category, with "Sin categoría" for the ones without one
  And with no expenses it says "Sin gastos en este periodo"

Scenario: Cash flow
  Given the period has movements
  Then a chart shows the incomes and the expenses day by day

Scenario: The balance of each account
  Given the user has accounts
  Then the home shows the current balance of each one, the opening balance plus the incomes minus the expenses of all its movements

Scenario: The fixed expenses
  Given the user has active fixed expenses
  Then the home lists them (see 006)

Scenario: The user sees the movements of the period
  Given the period has movements
  Then the home lists them with date, description, account, category, subcategory and amount, the newest first
  And an expense is shown as negative and an income as positive
# Owner: "ver, editar y borrar movimientos se hace cuando lleguen los dashboards".

Scenario: The user edits a movement
  Given the list of movements
  When the user edits one
  Then they can change any of its data with the rules of the quick entry (004) and save

Scenario: The user deletes a movement
  Given the list of movements
  When the user deletes one and confirms
  Then the movement is gone

Scenario: The user edits or deletes several movements at once
  Given the list of movements
  When the user selects several with the box at the left of the first column (or all with the box of the header) and changes a field or deletes them
  Then the change or the deletion is applied to all the selected
# Owner: the bulk editing of the import (005) is reused here.
```

## Non-functional
- User data isolation (principle 5); money as integer cents; a balance is never negative-zero or rounded wrongly; accessible tables and charts (an alternative text or table for each chart); UI in Spanish; dates as dd/mm/yyyy; zero console errors.

## Out of scope
- The freelance numbers (012); paging or searching a very long list (the previous app had none).

## Open questions
- Confirmation text and the exact wording of the edit and the delete: decided by the rules of 003 and 004.
