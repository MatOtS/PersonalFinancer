import { describe, expect, it } from "vitest";
import {
  listBankProfilesWithClient,
  saveBankProfileWithClient,
} from "./bank-profiles";
import { clientWith, json, recording } from "./fake-client";

describe("The columns remembered for an account", () => {
  it("are listed by the id of the account, with 'no sign column' as empty", async () => {
    const { fetchImpl } = recording(() =>
      json(200, [
        {
          account_id: "a1",
          date_column: "Fecha",
          description_column: "Concepto",
          amount_column: "Importe",
          sign_column: null,
        },
      ]),
    );
    expect(await listBankProfilesWithClient(clientWith(fetchImpl))).toEqual({
      a1: {
        date: "Fecha",
        description: "Concepto",
        amount: "Importe",
        sign: "",
      },
    });
  });

  it("are saved over the old ones of the same account", async () => {
    const { fetchImpl, requests } = recording(
      () => new Response(null, { status: 201 }),
    );
    await saveBankProfileWithClient(clientWith(fetchImpl), "a1", {
      date: "Fecha",
      description: "Concepto",
      amount: "Importe",
      sign: "Dirección",
    });
    expect(requests[0]?.body).toEqual({
      account_id: "a1",
      date_column: "Fecha",
      description_column: "Concepto",
      amount_column: "Importe",
      sign_column: "Dirección",
    });
    expect(requests[0]?.query).toContain("on_conflict=user_id,account_id");
  });
});
