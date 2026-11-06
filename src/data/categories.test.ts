import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/database.types";
import { DEFAULT_CATEGORIES } from "@/domain/default-categories";
import { nameKey } from "@/domain/names";
import { createFetchWithTimeout } from "@/lib/supabase/fetch-with-timeout";
import {
  CATEGORY_GONE,
  countSubcategoriesWithClient,
  createCategoryWithClient,
  createSubcategoryWithClient,
  deleteCategoryWithClient,
  DUPLICATE_CATEGORY,
  DUPLICATE_SUBCATEGORY,
  ensureDefaultCategoriesWithClient,
  listCategoriesWithClient,
  NESTED_SUBCATEGORY,
  renameCategoryWithClient,
  SUBCATEGORY_GONE,
} from "./categories";

// Same idea as accounts.test.ts: the real Supabase client with a fake network,
// so each answer of the database is reproduced here.
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const clientWith = (fetchImpl: typeof fetch) =>
  createClient<Database>("http://localhost:54321", "test-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: createFetchWithTimeout(1000, fetchImpl) },
  });

const CATEGORY_ID = "c0000000-0000-0000-0000-000000000001";
const SUBCATEGORY_ID = "c0000000-0000-0000-0000-000000000002";

// The unique index that a repeated name breaks tells the two cases apart.
const duplicate = (index: string) =>
  json(409, {
    code: "23505",
    details: null,
    hint: null,
    message: `duplicate key value violates unique constraint "${index}"`,
  });

// Answers the read of the parent (a GET) and the save (any other method)
// separately, and remembers what was asked, in order.
const network = (parentRows: unknown[], saveResponse: () => Response) => {
  const requests: { method: string; body: unknown }[] = [];
  const fetchImpl: typeof fetch = async (_url, init) => {
    const method = init?.method ?? "GET";
    requests.push({
      method,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
    return method === "GET" ? json(200, parentRows) : saveResponse();
  };
  return { fetchImpl, requests };
};

describe("listCategoriesWithClient", () => {
  it("groups by kind and puts each subcategory under its category, ordered by name", async () => {
    const groups = await listCategoriesWithClient(
      clientWith(async () =>
        json(200, [
          { id: "5", kind: "expense", name: "Supermercado", parent_id: "2" },
          { id: "1", kind: "expense", name: "Transporte", parent_id: null },
          { id: "3", kind: "income", name: "Nómina", parent_id: null },
          { id: "6", kind: "expense", name: "Restaurantes", parent_id: "2" },
          { id: "2", kind: "expense", name: "alimentación", parent_id: null },
          { id: "7", kind: "expense", name: "Combustible", parent_id: "1" },
          { id: "4", kind: "income", name: "Facturación", parent_id: null },
        ]),
      ),
    );
    expect(groups).toEqual({
      expense: [
        {
          id: "2",
          name: "alimentación",
          subcategories: [
            { id: "6", name: "Restaurantes" },
            { id: "5", name: "Supermercado" },
          ],
        },
        {
          id: "1",
          name: "Transporte",
          subcategories: [{ id: "7", name: "Combustible" }],
        },
      ],
      income: [
        { id: "4", name: "Facturación", subcategories: [] },
        { id: "3", name: "Nómina", subcategories: [] },
      ],
    });
  });

  it("gives two empty groups when there are no categories", async () => {
    const groups = await listCategoriesWithClient(
      clientWith(async () => json(200, [])),
    );
    expect(groups).toEqual({ expense: [], income: [] });
  });
});

describe("createCategoryWithClient", () => {
  it("saves the cleaned name with its comparison key and its kind", async () => {
    let sent: unknown;
    const fetchImpl: typeof fetch = async (_url, init) => {
      sent = JSON.parse(String(init?.body));
      return new Response(null, { status: 201 });
    };
    await createCategoryWithClient(clientWith(fetchImpl), {
      kind: "expense",
      name: "  Alimentación ",
    });
    expect(sent).toEqual({
      kind: "expense",
      name: "Alimentación",
      name_key: "alimentacion",
    });
  });

  it("answers ok when the category was saved", async () => {
    const result = await createCategoryWithClient(
      clientWith(async () => new Response(null, { status: 201 })),
      { kind: "income", name: "Facturación" },
    );
    expect(result).toEqual({ ok: true });
  });

  it("answers with the duplicate message when the name is already used by a category of that kind", async () => {
    const result = await createCategoryWithClient(
      clientWith(async () => duplicate("categories_top_level_name")),
      { kind: "expense", name: "Ocio" },
    );
    expect(result).toEqual({ ok: false, error: DUPLICATE_CATEGORY });
  });
});

describe("createSubcategoryWithClient", () => {
  it("takes the kind from its parent and saves the cleaned name", async () => {
    const { fetchImpl, requests } = network(
      [{ kind: "income", parent_id: null }],
      () => new Response(null, { status: 201 }),
    );
    const result = await createSubcategoryWithClient(
      clientWith(fetchImpl),
      CATEGORY_ID,
      "  Intereses ",
    );
    expect(result).toEqual({ ok: true });
    expect(requests.map((request) => request.method)).toEqual(["GET", "POST"]);
    expect(requests[1]?.body).toEqual({
      parent_id: CATEGORY_ID,
      kind: "income",
      name: "Intereses",
      name_key: "intereses",
    });
  });

  it("refuses a parent that is already a subcategory and saves nothing", async () => {
    const { fetchImpl, requests } = network(
      [{ kind: "expense", parent_id: CATEGORY_ID }],
      () => new Response(null, { status: 201 }),
    );
    const result = await createSubcategoryWithClient(
      clientWith(fetchImpl),
      SUBCATEGORY_ID,
      "Hijo",
    );
    expect(result).toEqual({ ok: false, error: NESTED_SUBCATEGORY });
    expect(requests.map((request) => request.method)).toEqual(["GET"]);
  });

  it("answers that the category no longer exists when the parent is not found, and saves nothing", async () => {
    const { fetchImpl, requests } = network(
      [],
      () => new Response(null, { status: 201 }),
    );
    const result = await createSubcategoryWithClient(
      clientWith(fetchImpl),
      CATEGORY_ID,
      "Supermercado",
    );
    expect(result).toEqual({ ok: false, error: CATEGORY_GONE });
    expect(requests.map((request) => request.method)).toEqual(["GET"]);
  });

  it("answers with the duplicate message when the category already has that subcategory", async () => {
    const { fetchImpl } = network([{ kind: "expense", parent_id: null }], () =>
      duplicate("categories_sub_name"),
    );
    const result = await createSubcategoryWithClient(
      clientWith(fetchImpl),
      CATEGORY_ID,
      "Supermercado",
    );
    expect(result).toEqual({ ok: false, error: DUPLICATE_SUBCATEGORY });
  });

  it("answers that the category no longer exists when it is deleted between the read and the save", async () => {
    const { fetchImpl } = network([{ kind: "expense", parent_id: null }], () =>
      json(409, {
        code: "23503",
        details: null,
        hint: null,
        message: "insert or update violates foreign key constraint",
      }),
    );
    const result = await createSubcategoryWithClient(
      clientWith(fetchImpl),
      CATEGORY_ID,
      "Supermercado",
    );
    expect(result).toEqual({ ok: false, error: CATEGORY_GONE });
  });
});

describe("renameCategoryWithClient", () => {
  it("saves the cleaned name with its comparison key", async () => {
    let sent: unknown;
    const fetchImpl: typeof fetch = async (_url, init) => {
      sent = JSON.parse(String(init?.body));
      return json(200, [{ id: CATEGORY_ID }]);
    };
    await renameCategoryWithClient(
      clientWith(fetchImpl),
      { id: CATEGORY_ID, parentId: null },
      "  Ocio y viajes ",
    );
    expect(sent).toEqual({ name: "Ocio y viajes", name_key: "ocio y viajes" });
  });

  it("answers ok when the category was renamed", async () => {
    const result = await renameCategoryWithClient(
      clientWith(async () => json(200, [{ id: CATEGORY_ID }])),
      { id: CATEGORY_ID, parentId: null },
      "Ocio",
    );
    expect(result).toEqual({ ok: true });
  });

  it("answers with the category duplicate message when a category takes a used name", async () => {
    const result = await renameCategoryWithClient(
      clientWith(async () => duplicate("categories_top_level_name")),
      { id: CATEGORY_ID, parentId: null },
      "Ocio",
    );
    expect(result).toEqual({ ok: false, error: DUPLICATE_CATEGORY });
  });

  it("answers with the subcategory duplicate message when a subcategory takes a used name", async () => {
    const result = await renameCategoryWithClient(
      clientWith(async () => duplicate("categories_sub_name")),
      { id: SUBCATEGORY_ID, parentId: CATEGORY_ID },
      "Supermercado",
    );
    expect(result).toEqual({ ok: false, error: DUPLICATE_SUBCATEGORY });
  });

  it("answers that the category no longer exists when no row changed", async () => {
    const result = await renameCategoryWithClient(
      clientWith(async () => json(200, [])),
      { id: CATEGORY_ID, parentId: null },
      "Ocio",
    );
    expect(result).toEqual({ ok: false, error: CATEGORY_GONE });
  });

  it("answers that the subcategory no longer exists when no row changed", async () => {
    const result = await renameCategoryWithClient(
      clientWith(async () => json(200, [])),
      { id: SUBCATEGORY_ID, parentId: CATEGORY_ID },
      "Supermercado",
    );
    expect(result).toEqual({ ok: false, error: SUBCATEGORY_GONE });
  });
});

describe("deleteCategoryWithClient", () => {
  it("answers ok when the category was deleted", async () => {
    const result = await deleteCategoryWithClient(
      clientWith(async () => json(200, [{ id: CATEGORY_ID }])),
      { id: CATEGORY_ID, parentId: null },
    );
    expect(result).toEqual({ ok: true });
  });

  it("answers that the category no longer exists when no row was deleted", async () => {
    const result = await deleteCategoryWithClient(
      clientWith(async () => json(200, [])),
      { id: CATEGORY_ID, parentId: null },
    );
    expect(result).toEqual({ ok: false, error: CATEGORY_GONE });
  });

  it("answers that the subcategory no longer exists when no row was deleted", async () => {
    const result = await deleteCategoryWithClient(
      clientWith(async () => json(200, [])),
      { id: SUBCATEGORY_ID, parentId: CATEGORY_ID },
    );
    expect(result).toEqual({ ok: false, error: SUBCATEGORY_GONE });
  });
});

describe("countSubcategoriesWithClient", () => {
  it("counts the subcategories of the category", async () => {
    const count = await countSubcategoriesWithClient(
      clientWith(async () =>
        json(200, [{ id: "1" }, { id: "2" }, { id: "3" }]),
      ),
      CATEGORY_ID,
    );
    expect(count).toBe(3);
  });

  it("is zero when the category has none", async () => {
    const count = await countSubcategoriesWithClient(
      clientWith(async () => json(200, [])),
      CATEGORY_ID,
    );
    expect(count).toBe(0);
  });

  it("asks only for the rows whose parent is that category", async () => {
    let asked = "";
    const fetchImpl: typeof fetch = async (url) => {
      asked = decodeURIComponent(String(url));
      return json(200, []);
    };
    await countSubcategoriesWithClient(clientWith(fetchImpl), CATEGORY_ID);
    expect(asked).toContain(`parent_id=eq.${CATEGORY_ID}`);
  });
});

// A fake database for ensureDefaultCategories: it answers the two reads (the
// marker and the categories the user already has), gives an id to every row
// that is saved, and records every request in order.
const ensureNetwork = (existing: {
  marker?: string;
  rows?: unknown[];
  failSave?: boolean;
}) => {
  const sent: { method: string; path: string; body: unknown }[] = [];
  let created = 0;
  const fetchImpl: typeof fetch = async (url, init) => {
    const method = init?.method ?? "GET";
    const path = new URL(String(url)).pathname.replace("/rest/v1/", "");
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    sent.push({ method, path, body });
    if (path === "profiles" && method === "GET") {
      return json(
        200,
        existing.marker
          ? [{ default_categories_added_at: existing.marker }]
          : [],
      );
    }
    if (path === "categories" && method === "GET") {
      return json(200, existing.rows ?? []);
    }
    if (path === "categories") {
      if (existing.failSave) {
        return json(500, {
          code: "XX000",
          message: "boom",
          details: null,
          hint: null,
        });
      }
      return json(
        201,
        (body as { kind: string; name_key: string }[]).map((row) => ({
          id: `new-${++created}`,
          kind: row.kind,
          name_key: row.name_key,
        })),
      );
    }
    return new Response(null, { status: 201 });
  };
  const saves = () =>
    sent.filter(
      (request) => request.method !== "GET" && request.path === "categories",
    );
  return { fetchImpl, sent, saves };
};

const TOTAL_SUBCATEGORIES = DEFAULT_CATEGORIES.reduce(
  (total, category) => total + category.subcategories.length,
  0,
);

describe("ensureDefaultCategoriesWithClient", () => {
  it("gives a new user the default categories, then their subcategories, then writes the marker last", async () => {
    const { fetchImpl, sent, saves } = ensureNetwork({});
    await ensureDefaultCategoriesWithClient(clientWith(fetchImpl));

    const [categories, subcategories] = saves();
    const categoryRows = categories?.body as Record<string, unknown>[];
    const subcategoryRows = subcategories?.body as Record<string, unknown>[];
    expect(saves()).toHaveLength(2);
    expect(categoryRows).toHaveLength(DEFAULT_CATEGORIES.length);
    expect(categoryRows).toContainEqual({
      kind: "expense",
      name: "Vivienda",
      name_key: "vivienda",
    });
    expect(subcategoryRows).toHaveLength(TOTAL_SUBCATEGORIES);

    // Each subcategory points to the id that its category was given.
    const feeding = DEFAULT_CATEGORIES.findIndex(
      (category) => category.name === "Alimentación",
    );
    expect(subcategoryRows).toContainEqual({
      parent_id: `new-${feeding + 1}`,
      kind: "expense",
      name: "Supermercado",
      name_key: "supermercado",
    });

    const last = sent[sent.length - 1];
    expect(last?.path).toBe("profiles");
    expect(last?.method).not.toBe("GET");
    expect(JSON.stringify(last?.body)).toContain("default_categories_added_at");
  });

  it("does nothing when the marker says they were already given", async () => {
    const { fetchImpl, sent } = ensureNetwork({
      marker: "2026-11-05T10:00:00Z",
    });
    await ensureDefaultCategoriesWithClient(clientWith(fetchImpl));
    expect(sent.map((request) => request.method + " " + request.path)).toEqual([
      "GET profiles",
    ]);
  });

  it("after a failure halfway adds only what is missing, under the category that already exists", async () => {
    const { fetchImpl, saves } = ensureNetwork({
      rows: [
        { id: "x1", kind: "expense", name_key: "vivienda", parent_id: null },
        { id: "x2", kind: "expense", name_key: "comunidad", parent_id: "x1" },
      ],
    });
    await ensureDefaultCategoriesWithClient(clientWith(fetchImpl));

    const [categories, subcategories] = saves();
    const categoryRows = categories?.body as { name: string }[];
    const subcategoryRows = subcategories?.body as { name: string }[];
    expect(categoryRows).toHaveLength(DEFAULT_CATEGORIES.length - 1);
    expect(categoryRows.map((row) => row.name)).not.toContain("Vivienda");
    expect(subcategoryRows).toHaveLength(TOTAL_SUBCATEGORIES - 1);
    expect(subcategoryRows).toContainEqual({
      parent_id: "x1",
      kind: "expense",
      name: "Alquiler/Hipoteca",
      name_key: "alquiler/hipoteca",
    });
    expect(subcategoryRows.map((row) => row.name)).not.toContain("Comunidad");
  });

  it("compares names ignoring capitals and accents", async () => {
    const { fetchImpl, saves } = ensureNetwork({
      rows: [
        {
          id: "x1",
          kind: "expense",
          name_key: "alimentacion",
          parent_id: null,
        },
      ],
    });
    await ensureDefaultCategoriesWithClient(clientWith(fetchImpl));
    const categoryRows = saves()[0]?.body as { name: string }[];
    expect(categoryRows.map((row) => row.name)).not.toContain("Alimentación");
  });

  it("does not mix a category of the other kind with the same name", async () => {
    const { fetchImpl, saves } = ensureNetwork({
      rows: [
        { id: "x9", kind: "income", name_key: "vivienda", parent_id: null },
      ],
    });
    await ensureDefaultCategoriesWithClient(clientWith(fetchImpl));
    const categoryRows = saves()[0]?.body as { name: string }[];
    expect(categoryRows.map((row) => row.name)).toContain("Vivienda");
  });

  it("writes the marker even when everything already exists, and saves nothing else", async () => {
    const rows = DEFAULT_CATEGORIES.flatMap((category, index) => [
      {
        id: `c${index}`,
        kind: category.kind,
        name_key: nameKey(category.name),
        parent_id: null,
      },
      ...category.subcategories.map((name) => ({
        id: `s${index}-${name}`,
        kind: category.kind,
        name_key: nameKey(name),
        parent_id: `c${index}`,
      })),
    ]);
    const { fetchImpl, sent, saves } = ensureNetwork({ rows });
    await ensureDefaultCategoriesWithClient(clientWith(fetchImpl));
    expect(saves()).toHaveLength(0);
    expect(sent[sent.length - 1]?.path).toBe("profiles");
  });

  it("throws and does not write the marker when saving fails, so the next sign-in tries again", async () => {
    const { fetchImpl, sent } = ensureNetwork({ failSave: true });
    await expect(
      ensureDefaultCategoriesWithClient(clientWith(fetchImpl)),
    ).rejects.toThrow("Could not give the default categories");
    expect(
      sent.filter(
        (request) => request.method !== "GET" && request.path === "profiles",
      ),
    ).toHaveLength(0);
  });
});
