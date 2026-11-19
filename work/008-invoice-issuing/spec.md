# 008: Invoice issuing

Status: done (verified by the owner's manual QA and the green gate, 2026-11-19)
Size: feature

## Intent
The freelancer issues invoices to their clients with their own fiscal data, lines, IVA and IRPF, and a correlative number. Model: the previous app, backlog item 9. Spanish rule kept: the number is assigned when the invoice is issued, never when it is created, so discarding a draft leaves no gap.

## Examples
```gherkin
Scenario: The user writes their billing data
  Given the user is in the settings page
  Then they can write the name or company name, the tax id, the phone, the address, the email and the IBAN that appear as the issuer of each invoice

Scenario: The user sets the billing defaults
  Given the user is in the settings page
  Then they can set the default IRPF percentage (15 at the start), the default IVA percentage (21 at the start), the number format (YYYY-NNN at the start) and the next number (1 at the start)

Scenario: The user creates a draft invoice
  Given the user has at least one client
  When they choose a client, an issue date (today by default), a due date (the issue date plus the default days) and one or more lines with a description, a quantity and a unit price, and save
  Then the invoice is saved as a draft with no number

Scenario: The totals of an invoice
  Given an invoice with lines, an IVA percentage and an IRPF percentage
  Then the base is the sum of quantity times unit price of the lines
  And the total is the base plus the IVA minus the IRPF

Scenario: A draft can be edited and deleted
  Given a draft invoice
  Then the user can change its client, dates, percentages and lines, or delete it
  And an issued or paid invoice cannot be deleted, because its number must stay in the series

Scenario: Issuing assigns the correlative number
  Given a draft invoice
  When the user issues it
  Then the invoice takes the next number with the configured format (the year for YYYY and the counter padded to three digits for NNN)
  And the next number of the settings grows by one
  And the invoice is now issued
```

## Non-functional
- User data isolation (principle 5) for invoices and lines; money as integer cents; UI in Spanish; zero console errors.
- A number is never used twice for the same user.

## Out of scope
- The PDF (009), marking as paid (010), the list and the dashboards (011 and 012), and the VAT and IRPF tax reserve (backlog item 12, which the previous app never had).

## Open questions
- Number of days of the default due date: the previous app took it from a setting of the form; the same default is used.
