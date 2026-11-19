# 012: Freelance dashboard

Status: done (verified by the owner's manual QA and the green gate, 2026-11-19)
Size: small

## Intent
The freelancer wants to see what the freelance work brings and what is pending to collect. Model: the previous app, backlog item 5 (second dashboard).

## Examples
```gherkin
Scenario: Freelance totals of the period
  Given movements marked as freelance
  Then the page shows their incomes, expenses and balance for the chosen period, and a cash flow chart of them

Scenario: Invoices pending of collection
  Given invoices
  Then the page shows how many issued invoices are pending, the amount pending (the net amount of the issued ones) and how many drafts there are
  And a draft is not counted as money owed

Scenario: Income by client
  Given freelance incomes with a client in the period
  Then a chart shows the income of each client
  And with none it says "Sin ingresos por cliente en este periodo"

Scenario: The invoices
  Given invoices
  Then the page lists them with number, client, dates, amount and status (draft, issued, paid)
  And from the list the user can edit or issue a draft, mark an issued invoice as paid, and open the PDF of an issued or paid one
```

## Non-functional
- User data isolation (principle 5); UI in Spanish; zero console errors.

## Out of scope
- The VAT and IRPF tax reserve (backlog item 12): the previous app never had it, so there is nothing to imitate. It needs the owner.

## Open questions
- None: the previous app is the model, except the tax reserve (see above).
