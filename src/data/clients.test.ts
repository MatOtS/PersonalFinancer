import { describe, expect, it } from "vitest";
import {
  CLIENT_GONE,
  createClientWithClient,
  listClientsWithClient,
  updateClientWithClient,
} from "./clients";
import { clientWith, json, recording } from "./fake-client";

const CLIENT = { name: "Acme", taxId: null, address: null, email: "a@b.test" };

describe("Clients", () => {
  it("lists them by name", async () => {
    const { fetchImpl } = recording(() =>
      json(200, [
        { id: "2", name: "Zeta", tax_id: null, address: null, email: null },
        { id: "1", name: "Acme", tax_id: "B1", address: "C/ 1", email: null },
      ]),
    );
    const list = await listClientsWithClient(clientWith(fetchImpl));
    expect(list.map((c) => c.name)).toEqual(["Acme", "Zeta"]);
    expect(list[0]).toMatchObject({ taxId: "B1", address: "C/ 1" });
  });

  it("saves the columns without the owner", async () => {
    const { fetchImpl, requests } = recording(
      () => new Response(null, { status: 201 }),
    );
    await createClientWithClient(clientWith(fetchImpl), CLIENT);
    expect(requests[0]?.body).toEqual({
      name: "Acme",
      tax_id: null,
      address: null,
      email: "a@b.test",
    });
  });

  it("says the client is gone when an update finds no row", async () => {
    const { fetchImpl } = recording(() => json(200, []));
    expect(
      await updateClientWithClient(clientWith(fetchImpl), "x", CLIENT),
    ).toEqual({ ok: false, error: CLIENT_GONE });
  });

  it("throws when saving fails", async () => {
    const { fetchImpl } = recording(() =>
      json(500, { code: "XX000", message: "boom", details: null, hint: null }),
    );
    await expect(
      createClientWithClient(clientWith(fetchImpl), CLIENT),
    ).rejects.toThrow("Could not save the client");
  });
});
