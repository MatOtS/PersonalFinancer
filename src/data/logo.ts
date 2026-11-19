import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { validateLogo } from "@/domain/logo";

type Client = SupabaseClient<Database>;

const BUCKET = "branding";

// The logo as a data address the PDF can embed, or null when there is none.
// Only the owner can read it (policies of the bucket).
export async function getLogoWithClient(
  supabase: Client,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("user_settings")
    .select("logo_path")
    .maybeSingle();
  if (error) throw new Error(`Could not load the logo, error: ${error}`);
  if (!data?.logo_path) return null;

  const file = await supabase.storage.from(BUCKET).download(data.logo_path);
  if (file.error || !file.data) return null;
  const bytes = Buffer.from(await file.data.arrayBuffer());
  return `data:${file.data.type || "image/png"};base64,${bytes.toString("base64")}`;
}

// Saves the file in the folder of the user and remembers its path. A new logo
// replaces the old one.
export async function saveLogoWithClient(
  supabase: Client,
  userId: string,
  file: { type: string; size: number; bytes: ArrayBuffer },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const check = validateLogo(file.type, file.size);
  if ("error" in check) return { ok: false, error: check.error };

  const path = `${userId}/logo.${check.extension}`;
  const upload = await supabase.storage
    .from(BUCKET)
    .upload(path, file.bytes, { contentType: check.type, upsert: true });
  if (upload.error) {
    throw new Error(
      `Could not upload the logo, error: ${upload.error.message}`,
    );
  }
  const { error } = await supabase
    .from("user_settings")
    .upsert({ logo_path: path }, { onConflict: "user_id" });
  if (error) throw new Error(`Could not save the logo, error: ${error}`);
  return { ok: true };
}

export async function hasLogoWithClient(supabase: Client): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_settings")
    .select("logo_path")
    .maybeSingle();
  if (error) throw new Error(`Could not load the logo, error: ${error}`);
  return Boolean(data?.logo_path);
}

export async function getLogo(): Promise<string | null> {
  return getLogoWithClient(await createClient());
}

export async function hasLogo(): Promise<boolean> {
  return hasLogoWithClient(await createClient());
}

export async function saveLogo(file: {
  type: string;
  size: number;
  bytes: ArrayBuffer;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("No user to save the logo for");
  return saveLogoWithClient(supabase, data.user.id, file);
}
