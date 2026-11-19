import type { CategoryGroups } from "@/data/categories";
import { compareCategoryNames } from "@/domain/names";
import type { SelectOption } from "@/components/ui/select-field";

// The categories of expense and of income in one list, ordered by name like
// the lists of the settings page (except "Otros", last): the list does not depend on the type.
export function categoryOptions(groups: CategoryGroups): SelectOption[] {
  return [...groups.expense, ...groups.income]
    .map((category) => ({ value: category.id, label: category.name }))
    .sort((a, b) => compareCategoryNames(a.label, b.label));
}

// The subcategories of the chosen category, ordered by name. None until a
// category is chosen: a subcategory needs its category.
export function subcategoryOptions(
  groups: CategoryGroups,
  categoryId: string | null,
): SelectOption[] {
  if (!categoryId) return [];
  const category = [...groups.expense, ...groups.income].find(
    (candidate) => candidate.id === categoryId,
  );
  return (category?.subcategories ?? [])
    .map((sub) => ({ value: sub.id, label: sub.name }))
    .sort((a, b) => compareCategoryNames(a.label, b.label));
}
