# 009: Invoice PDF

Status: done (verified by the owner's manual QA and the green gate, 2026-11-19)
Size: small

## Intent
An issued invoice must be sent to the client as a PDF with the issuer's data and logo. Model: the previous app, backlog item 10.

## Examples
```gherkin
Scenario: The user downloads the PDF of an issued invoice
  Given an issued or paid invoice
  When the user asks for its PDF
  Then a PDF is generated with the title FACTURA, the number, the issue date and the due date, the issuer, the client, the lines (description, quantity, price and amount), the base, the IVA, the IRPF and the total

Scenario: A draft has no PDF
  Given a draft invoice
  When its PDF is asked for
  Then no PDF is made and the message says the invoice is a draft and must be issued first

Scenario: An invoice of another user is not found
  Given an invoice of user A
  When user B asks for its PDF
  Then it is not found

Scenario: The issuer's logo
  Given the user uploaded a logo (png or jpg)
  Then the logo appears in the PDF
  And a logo in another format (svg) is skipped without breaking the PDF
```

## Non-functional
- User data isolation (principle 5); the PDF is made on the server, nothing stored; zero console errors.

## Out of scope
- Sending the invoice by email.

## Open questions
- None: the previous app is the model.
