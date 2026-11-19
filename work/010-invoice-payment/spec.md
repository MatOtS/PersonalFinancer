# 010: Invoice payment tracking

Status: done (verified by the owner's manual QA and the green gate, 2026-11-19)
Size: small

## Intent
When a client pays an invoice, the user marks it as paid and the money shows up as a freelance income. Model: the previous app, backlog item 11.

## Examples
```gherkin
Scenario: The user marks an issued invoice as paid
  Given an issued invoice
  When the user marks it as paid with a payment date
  Then the invoice is paid and keeps its payment date

Scenario: Paying creates the income movement
  Given an invoice that becomes paid
  Then a freelance income movement is created with the payment date, the net amount of the invoice, the description "Cobro factura <number>" and the client of the invoice
  And it goes to the first account the user created

Scenario: Paying twice creates one movement
  Given an invoice already paid
  When it is marked as paid again
  Then only one movement exists for that invoice
```

## Non-functional
- User data isolation (principle 5); the movement and the status change are made together or not at all; zero console errors.

## Out of scope
- Partial payments, reminders and overdue notices.

## Open questions
- The account of the income: the previous app used the first account created; the same is done. The user with no accounts has no place to put the income: the previous app did not say.
