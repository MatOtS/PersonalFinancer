"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const BUCKET = "branding";
const MAX_BYTES = 2 * 1024 * 1024;

/**
 * Uploads the invoice logo to the private `branding` bucket under the user's
 * own folder, which is what the storage policies key off. The stored value is
 * the object path, never a URL — the bucket is private, so a display URL has to
 * be signed and would expire.
 */
export function IssuerLogoUpload({ logoPath }: { logoPath: string | null }) {
  const [path, setPath] = useState(logoPath);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    // The bucket is private, so the preview needs a short-lived signed URL.
    // Clearing on an absent path is folded into the same async resolution
    // rather than set straight from the effect body.
    const resolve = path
      ? createClient()
          .storage.from(BUCKET)
          .createSignedUrl(path, 60 * 10)
          .then(({ data }) => data?.signedUrl ?? null)
      : Promise.resolve(null);

    resolve.then((url) => {
      if (active) setPreview(url);
    });

    return () => {
      active = false;
    };
  }, [path]);

  async function upload(file: File) {
    setMessage(null);

    if (file.size > MAX_BYTES) {
      setMessage("El logo supera los 2 MB.");
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setBusy(false);
      setMessage("Sesión expirada, volvé a entrar.");
      return;
    }

    const extension = file.name.split(".").pop()?.toLowerCase() ?? "png";
    const objectPath = `${user.id}/logo.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(objectPath, file, { upsert: true });

    if (uploadError) {
      setBusy(false);
      setMessage(`No se pudo subir: ${uploadError.message}`);
      return;
    }

    const { error: saveError } = await supabase
      .from("user_settings")
      .update({ logo_path: objectPath })
      .eq("user_id", user.id);

    setBusy(false);

    if (saveError) {
      setMessage(`Se subió pero no se guardó la referencia: ${saveError.message}`);
      return;
    }

    setPath(objectPath);
    setMessage("Logo actualizado ✓");
  }

  async function remove() {
    if (!path) return;
    setBusy(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.storage.from(BUCKET).remove([path]);
    if (user) {
      await supabase.from("user_settings").update({ logo_path: null }).eq("user_id", user.id);
    }

    setBusy(false);
    setPath(null);
    setMessage("Logo eliminado.");
  }

  return (
    <div className="flex flex-col gap-3">
      {preview && (
        // Signed, short-lived storage URL: next/image would need the host
        // allow-listed and buys nothing for a logo shown once in settings.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt="Logo actual"
          className="h-16 w-auto max-w-48 self-start object-contain"
          src={preview}
        />
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          accept="image/png,image/jpeg,image/svg+xml"
          className="text-sm"
          disabled={busy}
          id="issuer-logo"
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
          type="file"
        />
        {path && (
          <Button disabled={busy} onClick={remove} size="sm" type="button" variant="destructive">
            Quitar
          </Button>
        )}
      </div>

      <p className="text-muted-foreground text-xs">PNG, JPG o SVG, hasta 2 MB.</p>
      {message && <p className="text-sm">{message}</p>}
    </div>
  );
}
