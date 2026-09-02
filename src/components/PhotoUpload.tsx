"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { setPhotoPath } from "@/app/profil/actions";

const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export function PhotoUpload({ refereeId, photoUrl }: { refereeId: string; photoUrl: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("Vyber obrázok (JPG, PNG).");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError("Fotka je príliš veľká (max 5 MB).");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${refereeId}/photo.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("referee-photos")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      await setPhotoPath(path);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nahranie sa nepodarilo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="Fotka rozhodcu" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">Bez fotky</div>
        )}
      </div>
      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        <button
          type="button"
          disabled={loading}
          onClick={() => inputRef.current?.click()}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          {loading ? "Nahrávam…" : photoUrl ? "Zmeniť fotku" : "Nahrať fotku"}
        </button>
        {error && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </div>
  );
}
