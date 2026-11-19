# 006: Fixed expenses

Status: done (verified by the owner's manual QA and the green gate, 2026-11-19)
Size: small

## Intent
Some expenses repeat (rent, subscriptions, taxes). The user wants to list them with their amount and how often they happen, so the dashboard can show them. Model: the previous app (`legacy/`), backlog item 7.

## Examples
```gherkin
Scenario: The user adds a fixed expense
  Given the user is in the settings page
  When they write a name, an amount and a frequency (monthly, bimonthly, quarterly or annual) and add it
  Then the fixed expense is saved and appears in the list of the settings page
# Previous app: name, amount, frequency, optional account and optional category ("Sin cuenta", "Sin categoría").

Scenario: A fixed expense needs a name and an amount
  Given the user is adding a fixed expense
  When the name or the amount is empty
  Then nothing is saved
# Previous app: it ignored the form silently. Which message to show is decided by the rules of the forms of 003.

Scenario: The account and the category of a fixed expense are optional
  Given the user is adding a fixed expense
  Then they may choose an account of theirs and a category of theirs, or leave them empty

Scenario: The active fixed expenses are listed on the home dashboard
  Given the user has fixed expenses
  Then the home dashboard lists the active ones, each with its name, its frequency and its amount
  And with none, it says "Sin gastos fijos configurados"
# Previous app: the same; the frequency shown as Mensual, Bimestral, Trimestral or Anual.
```

## Non-functional
- User data isolation (principle 5), money as integer cents, UI in Spanish (principle 6), zero console errors.

## Out of scope
- Changing, pausing or deleting a fixed expense: the previous app only added them.
- Generating movements from a fixed expense (recurring movements).

## Open questions
- None: the previous app is the model.
