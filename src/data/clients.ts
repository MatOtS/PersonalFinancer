import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import type { ValidClient } from "@/domain/clients";
import { compareNames } from "@/domain/names";

type Client = SupabaseClient<Database>;

export type ClientRecord = {
  id: string;
  name: string;
  taxId: string | null;
  address: string | null;
  email: string | null;
};
export type ClientResult = { ok: true } | { ok: false; error: string };

export const CLIENT_GONE = "Este cliente ya no existe";

// Same layout as accounts.ts: the function with the client holds the logic and
// is what the tests call; the plain one creates the real client.

export async function listClientsWithClient(
  supabase: Client,
): Promise<ClientRecord[]> {
  const { data, error } = await supabase
    .from("clients")
    .select("id, name, tax_id, address, email");
  if (error) throw new Error(`Could not load the clients, error: ${error}`);
  return data
    .map((row) => ({
      id: row.id,
      name: row.name,
      taxId: row.tax_id,
      address: row.address,
      email: row.email,
    }))
    .sort((a, b) => compareNames(a.name, b.name));
}

const columns = (client: ValidClient) => ({
  name: client.name,
  tax_id: client.taxId,
  address: client.address,
  email: client.email,
});

export async function createClientWithClient(
  supabase: Client,
  client: ValidClient,
): Promise<ClientResult> {
  const { error } = await supabase.from("clients").insert(columns(client));
  if (error) throw new Error(`Could not save the client, error: ${error}`);
  return { ok: true };
}

export async function updateClientWithClient(
  supabase: Client,
  id: string,
  client: ValidClient,
): Promise<ClientResult> {
  const { data, error } = await supabase
    .from("clients")
    .update(columns(client))
    .eq("id", id)
    .select("id");
  if (error) throw new Error(`Could not update the client, error: ${error}`);
  if (data.length === 0) return { ok: false, error: CLIENT_GONE };
  return { ok: true };
}

export async function listClients(): Promise<ClientRecord[]> {
  return listClientsWithClient(await createClient());
}

export async function createClientRecord(
  client: ValidClient,
): Promise<ClientResult> {
  return createClientWithClient(await createClient(), client);
}

export async function updateClientRecord(
  id: string,
  client: ValidClient,
): Promise<ClientResult> {
  return updateClientWithClient(await createClient(), id, client);
}
