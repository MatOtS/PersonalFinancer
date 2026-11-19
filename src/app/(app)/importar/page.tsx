import { ImportWizard } from "@/components/import/import-wizard";
import { listAccounts } from "@/data/accounts";
import { listBankProfiles } from "@/data/bank-profiles";
import { listCategories } from "@/data/categories";
import { listKeywords } from "@/data/keywords";

export default async function ImportPage() {
  const [accounts, categories, profiles, keywords] = await Promise.all([
    listAccounts(),
    listCategories(),
    listBankProfiles(),
    listKeywords(),
  ]);

  return (
    <>
      <h1 className="text-h1 font-bold">Importar</h1>
      <p className="mt-1 text-body text-text-muted">
        Trae los movimientos de un extracto de tu banco (.csv, .xlsx o .xls). El
        archivo se lee en tu navegador y no se sube a ningún sitio: solo se
        guardan los movimientos que confirmes.
      </p>
      <ImportWizard
        accounts={accounts}
        categories={categories}
        profiles={profiles}
        keywords={keywords}
      />
    </>
  );
}
