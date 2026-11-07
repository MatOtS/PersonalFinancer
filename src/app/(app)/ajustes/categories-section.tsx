import type { CategoryGroups } from "@/data/categories";
import { CategoryList } from "./category-list";

export const CategoriesSection = ({ groups }: { groups: CategoryGroups }) => {
  return (
    <section
      id="categorias"
      aria-labelledby="categorias-title"
      className="mt-6 rounded-lg border border-border bg-surface p-6 shadow-card"
    >
      <h2 id="categorias-title" className="text-h2 font-semibold">
        Categorías
      </h2>
      <CategoryList groups={groups} />
    </section>
  );
};
