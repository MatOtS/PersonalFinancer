import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_CATEGORIES } from "@/domain/default-categories";
import { cleanName, compareNames, nameKey } from "@/domain/names";

type Client = SupabaseClient<Database>;

export type Kind = "expense" | "income";
export type Subcategory = { id: string; name: string };
export type Category = {
  id: string;
  name: string;
  subcategories: Subcategory[];
};
export type CategoryGroups = Record<Kind, Category[]>;
// What the caller already knows about the element: `parentId` is null for a
// category and the id of its category for a subcategory.
export type CategoryRef = { id: string; parentId: string | null };
export type CategoryResult = { ok: true } | { ok: false; error: string };

export const DUPLICATE_CATEGORY = "Ya tienes una categoría con ese nombre";
export const DUPLICATE_SUBCATEGORY =
  "Ya tienes una subcategoría con ese nombre en esta categoría";
export const CATEGORY_GONE = "Esta categoría ya no existe";
export const SUBCATEGORY_GONE = "Esta subcategoría ya no existe";
export const NESTED_SUBCATEGORY =
  "No puedes crear una subcategoría de una subcategoría";

const duplicateMessage = (ref: CategoryRef) =>
  ref.parentId === null ? DUPLICATE_CATEGORY : DUPLICATE_SUBCATEGORY;
const goneMessage = (ref: CategoryRef) =>
  ref.parentId === null ? CATEGORY_GONE : SUBCATEGORY_GONE;

const byName = (a: { name: string }, b: { name: string }) =>
  compareNames(a.name, b.name);

// Same layout as accounts.ts: the function with the client holds the logic and
// is what the tests call; the plain one creates the real client.

export async function listCategoriesWithClient(
  supabase: Client,
): Promise<CategoryGroups> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, kind, name, parent_id");
  if (error) throw new Error(`Could not load the categories, error: ${error}`);

  const subcategoriesOf = new Map<string, Subcategory[]>();
  for (const row of data) {
    if (row.parent_id === null) continue;
    const siblings = subcategoriesOf.get(row.parent_id) ?? [];
    siblings.push({ id: row.id, name: row.name });
    subcategoriesOf.set(row.parent_id, siblings);
  }

  const groups: CategoryGroups = { expense: [], income: [] };
  for (const row of data) {
    if (row.parent_id !== null) continue;
    groups[row.kind === "income" ? "income" : "expense"].push({
      id: row.id,
      name: row.name,
      subcategories: (subcategoriesOf.get(row.id) ?? []).sort(byName),
    });
  }
  groups.expense.sort(byName);
  groups.income.sort(byName);
  return groups;
}

export async function createCategoryWithClient(
  supabase: Client,
  input: { kind: Kind; name: string },
): Promise<CategoryResult> {
  const { error } = await supabase.from("categories").insert({
    kind: input.kind,
    name: cleanName(input.name),
    name_key: nameKey(input.name),
  });
  if (error?.code === "23505") {
    return { ok: false, error: DUPLICATE_CATEGORY };
  }
  if (error) throw new Error(`Could not save the category, error: ${error}`);
  return { ok: true };
}

export async function createSubcategoryWithClient(
  supabase: Client,
  parentId: string,
  name: string,
): Promise<CategoryResult> {
  // The kind comes from the parent, and only a category can be a parent. Zero
  // rows is also what another user's category looks like (RLS).
  const { data: parents, error: readError } = await supabase
    .from("categories")
    .select("kind, parent_id")
    .eq("id", parentId);
  if (readError) {
    throw new Error(`Could not read the category, error: ${readError}`);
  }
  const parent = parents[0];
  if (!parent) return { ok: false, error: CATEGORY_GONE };
  if (parent.parent_id !== null) {
    return { ok: false, error: NESTED_SUBCATEGORY };
  }

  const { error } = await supabase.from("categories").insert({
    parent_id: parentId,
    kind: parent.kind,
    name: cleanName(name),
    name_key: nameKey(name),
  });
  if (error?.code === "23505") {
    return { ok: false, error: DUPLICATE_SUBCATEGORY };
  }
  // The category was deleted between the read and the save.
  if (error?.code === "23503") return { ok: false, error: CATEGORY_GONE };
  if (error) {
    throw new Error(`Could not save the subcategory, error: ${error}`);
  }
  return { ok: true };
}

export async function renameCategoryWithClient(
  supabase: Client,
  ref: CategoryRef,
  name: string,
): Promise<CategoryResult> {
  const { data, error } = await supabase
    .from("categories")
    .update({ name: cleanName(name), name_key: nameKey(name) })
    .eq("id", ref.id)
    .select("id");
  if (error?.code === "23505") {
    return { ok: false, error: duplicateMessage(ref) };
  }
  if (error) throw new Error(`Could not rename the category, error: ${error}`);
  if (data.length === 0) return { ok: false, error: goneMessage(ref) };
  return { ok: true };
}

// A category takes its subcategories with it (`on delete cascade`).
export async function deleteCategoryWithClient(
  supabase: Client,
  ref: CategoryRef,
): Promise<CategoryResult> {
  const { data, error } = await supabase
    .from("categories")
    .delete()
    .eq("id", ref.id)
    .select("id");
  if (error) throw new Error(`Could not delete the category, error: ${error}`);
  if (data.length === 0) return { ok: false, error: goneMessage(ref) };
  return { ok: true };
}

export async function countSubcategoriesWithClient(
  supabase: Client,
  categoryId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("categories")
    .select("id")
    .eq("parent_id", categoryId);
  if (error) {
    throw new Error(`Could not count the subcategories, error: ${error}`);
  }
  return data.length;
}

// Gives a user the default categories once. It reads what the user already has
// and saves only what is missing, so a sign-in that failed halfway is simply
// retried: the marker in `profiles` is written last, only when everything is
// saved. Names are compared by kind and `nameKey`, like the unique indexes.
export async function ensureDefaultCategoriesWithClient(
  supabase: Client,
): Promise<void> {
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("default_categories_added_at");
  if (profileError) {
    throw new Error(`Could not read the profile, error: ${profileError}`);
  }
  if (profiles[0]?.default_categories_added_at) return;

  const { data: existing, error: readError } = await supabase
    .from("categories")
    .select("id, kind, name_key, parent_id");
  if (readError) {
    throw new Error(`Could not read the categories, error: ${readError}`);
  }
  const categoryIds = new Map<string, string>();
  const subcategoryKeys = new Set<string>();
  for (const row of existing) {
    if (row.parent_id === null) {
      categoryIds.set(`${row.kind}:${row.name_key}`, row.id);
    } else {
      subcategoryKeys.add(`${row.parent_id}:${row.name_key}`);
    }
  }

  const missingCategories = DEFAULT_CATEGORIES.filter(
    (category) =>
      !categoryIds.has(`${category.kind}:${nameKey(category.name)}`),
  );
  if (missingCategories.length > 0) {
    const { data: created, error } = await supabase
      .from("categories")
      .insert(
        missingCategories.map((category) => ({
          kind: category.kind,
          name: cleanName(category.name),
          name_key: nameKey(category.name),
        })),
      )
      .select("id, kind, name_key");
    if (error) {
      throw new Error(`Could not give the default categories, error: ${error}`);
    }
    for (const row of created) {
      categoryIds.set(`${row.kind}:${row.name_key}`, row.id);
    }
  }

  const missingSubcategories = DEFAULT_CATEGORIES.flatMap((category) => {
    const parentId = categoryIds.get(
      `${category.kind}:${nameKey(category.name)}`,
    );
    if (!parentId) return [];
    return category.subcategories
      .filter((name) => !subcategoryKeys.has(`${parentId}:${nameKey(name)}`))
      .map((name) => ({
        parent_id: parentId,
        kind: category.kind,
        name: cleanName(name),
        name_key: nameKey(name),
      }));
  });
  if (missingSubcategories.length > 0) {
    const { error } = await supabase
      .from("categories")
      .insert(missingSubcategories);
    if (error) {
      throw new Error(
        `Could not give the default subcategories, error: ${error}`,
      );
    }
  }

  const { error: markerError } = await supabase
    .from("profiles")
    .upsert({ default_categories_added_at: new Date().toISOString() });
  if (markerError) {
    throw new Error(`Could not save the profile, error: ${markerError}`);
  }
}

export async function listCategories(): Promise<CategoryGroups> {
  return listCategoriesWithClient(await createClient());
}

export async function createCategory(input: {
  kind: Kind;
  name: string;
}): Promise<CategoryResult> {
  return createCategoryWithClient(await createClient(), input);
}

export async function createSubcategory(
  parentId: string,
  name: string,
): Promise<CategoryResult> {
  return createSubcategoryWithClient(await createClient(), parentId, name);
}

export async function renameCategory(
  ref: CategoryRef,
  name: string,
): Promise<CategoryResult> {
  return renameCategoryWithClient(await createClient(), ref, name);
}

export async function deleteCategory(
  ref: CategoryRef,
): Promise<CategoryResult> {
  return deleteCategoryWithClient(await createClient(), ref);
}

export async function countSubcategories(categoryId: string): Promise<number> {
  return countSubcategoriesWithClient(await createClient(), categoryId);
}

export async function ensureDefaultCategories(): Promise<void> {
  return ensureDefaultCategoriesWithClient(await createClient());
}
