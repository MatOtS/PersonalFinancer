export type CategoryKind = "expense" | "income";

export type DefaultCategory = {
  kind: CategoryKind;
  name: string;
  subcategories: readonly string[];
};

// The categories every user receives once, the first time they sign in. After
// that they belong to the user, who can rename or delete them.
export const DEFAULT_CATEGORIES: readonly DefaultCategory[] = [
  {
    kind: "expense",
    name: "Vivienda",
    subcategories: ["Alquiler/Hipoteca", "Comunidad", "Mantenimiento"],
  },
  {
    kind: "expense",
    name: "Suministros",
    subcategories: ["Luz", "Agua", "Gas", "Internet"],
  },
  {
    kind: "expense",
    name: "Alimentación",
    subcategories: ["Supermercado", "Restaurantes"],
  },
  {
    kind: "expense",
    name: "Transporte",
    subcategories: [
      "Combustible",
      "Transporte público",
      "Mantenimiento vehículo",
    ],
  },
  {
    kind: "expense",
    name: "Ocio",
    subcategories: ["Salidas", "Viajes", "Hobbies"],
  },
  {
    kind: "expense",
    name: "Suscripciones",
    subcategories: ["Streaming", "Software personal"],
  },
  {
    kind: "expense",
    name: "Material/Equipo freelance",
    subcategories: ["Hardware", "Herramientas"],
  },
  {
    kind: "expense",
    name: "Software",
    subcategories: ["Licencias", "SaaS"],
  },
  {
    kind: "expense",
    name: "Impuestos",
    subcategories: ["IRPF", "IVA", "Autónomos"],
  },
  {
    kind: "expense",
    name: "Salud",
    subcategories: ["Seguro médico", "Farmacia"],
  },
  { kind: "expense", name: "Otros", subcategories: [] },
  { kind: "income", name: "Facturación", subcategories: [] },
  { kind: "income", name: "Nómina", subcategories: [] },
  { kind: "income", name: "Devoluciones", subcategories: [] },
  { kind: "income", name: "Otros ingresos", subcategories: [] },
];
