# 007: Clients

Status: done (verified by the owner's manual QA and the green gate, 2026-11-19)
Size: small

## Intent
A freelancer invoices clients. The user keeps a list of their clients with the data an invoice needs. Model: the previous app, backlog item 8.

## Examples
```gherkin
Scenario: The user adds a client
  Given the user is in the settings page or in the new invoice form
  When they write the name of a client and add it
  Then the client is saved and can be chosen for an invoice
# Previous app: a client can also be created from the new invoice form.

Scenario: A client has fiscal data
  Given a client
  Then it can have a tax id (NIF or CIF), an address and an email, all optional

Scenario: The user edits a client
  Given the user has clients
  When they change the name, the tax id, the address or the email and save
  Then the client is saved with the changes
# Previous app: each client is an editable form in the settings page.

Scenario: A client needs a name
  Given the user is adding or editing a client
  When the name is empty
  Then nothing is saved
```

## Non-functional
- User data isolation (principle 5), UI in Spanish, zero console errors.

## Out of scope
- Deleting a client (the previous app did not).

## Open questions
- None: the previous app is the model.
