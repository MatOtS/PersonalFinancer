export interface CategoryKeyword {
  keyword: string;
  category_id: string;
  subcategory_id: string | null;
}

export function matchCategory(description: string, keywords: CategoryKeyword[]) {
  const lower = description.toLowerCase();
  const match = keywords.find((k) => lower.includes(k.keyword.toLowerCase()));
  return match ? { category_id: match.category_id, subcategory_id: match.subcategory_id } : null;
}
