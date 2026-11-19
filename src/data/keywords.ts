import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_GONE } from "./categories";
import { nameKey } from "@/domain/names";

type Client = SupabaseClient<Database>;

export type KeywordRecord = {
  id: string;
  keyword: string;
  categoryId: string;
};
export type KeywordResult = { ok: true } | { ok: false; error: string };

export const DUPLICATE_KEYWORD = "Ya tienes esa palabra";

// Same layout as accounts.ts: the function with the client holds the logic and
// is what the tests call; the plain one creates the real client.

// In the order they were added: the first word that matches wins.
export async function listKeywordsWithClient(
  supabase: Client,
): Promise<KeywordRecord[]> {
  const { data, error } = await supabase
    .from("category_keywords")
    .select("id, keyword, category_id")
    .order("created_at")
    .order("id");
  if (error) throw new Error(`Could not load the words, error: ${error}`);
  return data.map((row) => ({
    id: row.id,
    keyword: row.keyword,
    categoryId: row.category_id,
  }));
}

export async function createKeywordWithClient(
  supabase: Client,
  keyword: string,
  categoryId: string,
): Promise<KeywordResult> {
  const { error } = await supabase.from("category_keywords").insert({
    keyword,
    keyword_key: nameKey(keyword),
    category_id: categoryId,
  });
  if (error?.code === "23505") return { ok: false, error: DUPLICATE_KEYWORD };
  if (error?.code === "23503") return { ok: false, error: CATEGORY_GONE };
  if (error) throw new Error(`Could not save the word, error: ${error}`);
  return { ok: true };
}

export async function listKeywords(): Promise<KeywordRecord[]> {
  return listKeywordsWithClient(await createClient());
}

export async function createKeyword(
  keyword: string,
  categoryId: string,
): Promise<KeywordResult> {
  return createKeywordWithClient(await createClient(), keyword, categoryId);
}
