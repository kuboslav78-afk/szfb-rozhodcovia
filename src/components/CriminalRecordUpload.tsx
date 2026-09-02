"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { setCriminalRecordPath } from "@/app/profil/actions";

const MAX_SIZE_BYTES = 10 * 1024 * 1024;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("sk-SK", { day: "numeric", month: "numeric", year: "numeric" });
}

export function CriminalRecordUpload({
  refereeId,
  uploadedAt,
  downloadUrl,
}: {
  refereeId: string;
  uploadedAt: string | null;
  downloadUrl: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);

    if (file.type !== "application/pdf") {
      setError("Nahraj súbor vo formáte PDF.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError("Súbor je príliš veľký (max 10 MB).");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const path = `${refereeId}/vypis-registra-trestov.pdf`;

      const { error: uploadError } = await supabase.storage
        .from("referee-documents")
        .upload(path, file, { upsert: true, contentType: "application/pdf" });

      if (uploadError) throw uploadError;

      await setCriminalRecordPath(path);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nahranie sa nepodarilo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
      <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">Výpis z registra trestov</h2>
      <p className="mt-1 text-xs text-zinc-500">
        PDF, viditeľný len tebe a administrátorovi. Max 10 MB.
      </p>

      <div className="mt-4 flex items-center gap-3">
        {uploadedAt ? (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            Nahraný {formatDate(uploadedAt)}
          </span>
        ) : (
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
            Zatiaľ nenahraný
          </span>
        )}
        {downloadUrl && (
          <a href={downloadUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-indigo hover:underline">
            Zobraziť súbor
          </a>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
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
        className="mt-3 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
      >
        {loading ? "Nahrávam…" : uploadedAt ? "Nahrať nový výpis" : "Nahrať výpis (PDF)"}
      </button>
      {error && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
