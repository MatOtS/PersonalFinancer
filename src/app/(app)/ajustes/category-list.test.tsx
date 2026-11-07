import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EditCategoryForm } from "./edit-category-form";
import { deleteText } from "./category-list";

describe("deleteText", () => {
  it("names the category and how many subcategories go with it", () => {
    expect(deleteText("Transporte", 3)).toEqual({
      title: "¿Eliminar la categoría?",
      description:
        'Se eliminará la categoría "Transporte" con 3 subcategorías. Esta acción no se puede deshacer.',
    });
  });

  it("uses the singular for one subcategory", () => {
    expect(deleteText("Ocio", 1).description).toBe(
      'Se eliminará la categoría "Ocio" con 1 subcategoría. Esta acción no se puede deshacer.',
    );
  });

  it("does not mention subcategories when there are none", () => {
    expect(deleteText("Otros", 0).description).toBe(
      'Se eliminará la categoría "Otros". Esta acción no se puede deshacer.',
    );
  });

  it("names a subcategory", () => {
    expect(deleteText("Luz", null)).toEqual({
      title: "¿Eliminar la subcategoría?",
      description:
        'Se eliminará la subcategoría "Luz". Esta acción no se puede deshacer.',
    });
  });
});

describe("EditCategoryForm", () => {
  it("lets the user change the name but not the type", () => {
    const html = renderToStaticMarkup(
      <EditCategoryForm
        id="c1"
        parentId={null}
        name="Alimentación"
        onDone={() => {}}
        onNotice={() => {}}
      />,
    );
    expect(html).toContain('name="name"');
    expect(html).toContain('value="Alimentación"');
    expect(html).not.toContain('name="kind"');
    expect(html).not.toContain("<select");
    expect(html).not.toContain('type="radio"');
  });

  it("sends an empty parentId for a category and the parent for a subcategory", () => {
    const category = renderToStaticMarkup(
      <EditCategoryForm
        id="c1"
        parentId={null}
        name="Ocio"
        onDone={() => {}}
        onNotice={() => {}}
      />,
    );
    const sub = renderToStaticMarkup(
      <EditCategoryForm
        id="s1"
        parentId="c1"
        name="Viajes"
        onDone={() => {}}
        onNotice={() => {}}
      />,
    );
    expect(category).toContain('name="parentId" value=""');
    expect(sub).toContain('name="parentId" value="c1"');
  });
});
