import { describe, expect, it } from "vitest";
import { CATEGORY_GONE } from "./categories";
import { clientWith, json, recording } from "./fake-client";
import {
  createKeywordWithClient,
  DUPLICATE_KEYWORD,
  listKeywordsWithClient,
} from "./keywords";

const error = (code: string) =>
  json(409, { code, message: "boom", details: null, hint: null });

describe("The words of the user", () => {
  it("are listed in the order they were added", async () => {
    const { fetchImpl, requests } = recording(() =>
      json(200, [{ id: "1", keyword: "mercadona", category_id: "c1" }]),
    );
    expect(await listKeywordsWithClient(clientWith(fetchImpl))).toEqual([
      { id: "1", keyword: "mercadona", categoryId: "c1" },
    ]);
    expect(requests[0]?.query).toContain("order=created_at");
  });

  it("are saved with their key, which ignores capitals and accents", async () => {
    const { fetchImpl, requests } = recording(
      () => new Response(null, { status: 201 }),
    );
    await createKeywordWithClient(clientWith(fetchImpl), "Cafetería", "c1");
    expect(requests[0]?.body).toEqual({
      keyword: "Cafetería",
      keyword_key: "cafeteria",
      category_id: "c1",
    });
  });

  it("say when the word exists or the category is gone", async () => {
    expect(
      await createKeywordWithClient(
        clientWith(recording(() => error("23505")).fetchImpl),
        "x",
        "c1",
      ),
    ).toEqual({ ok: false, error: DUPLICATE_KEYWORD });
    expect(
      await createKeywordWithClient(
        clientWith(recording(() => error("23503")).fetchImpl),
        "x",
        "c1",
      ),
    ).toEqual({ ok: false, error: CATEGORY_GONE });
  });
});
