"use client";

import { useMemo, useState } from "react";
import { getEmailRecipients, sendKroEmail, type EmailRecipient, type RecipientFilter } from "@/app/kro/actions";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/categories";

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

type Mode = "all" | "region" | "selected";

export function EmailComposer({ referees }: { referees: EmailRecipient[] }) {
  const [mode, setMode] = useState<Mode>("all");
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [checkingCount, setCheckingCount] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filter: RecipientFilter = useMemo(() => {
    if (mode === "region") return { mode: "region", categories };
    if (mode === "selected") return { mode: "selected", refereeIds: Array.from(selectedIds) };
    return { mode: "all" };
  }, [mode, categories, selectedIds]);

  const filteredReferees = useMemo(() => {
    const q = normalize(search.trim());
    if (!q) return referees;
    return referees.filter((r) => normalize(r.full_name).includes(q));
  }, [referees, search]);

  function toggleCategory(cat: Category) {
    setCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
    setPreviewCount(null);
    setConfirming(false);
  }

  function toggleReferee(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setPreviewCount(null);
    setConfirming(false);
  }

  function changeMode(next: Mode) {
    setMode(next);
    setPreviewCount(null);
    setConfirming(false);
  }

  async function handlePrepareSend() {
    setError(null);
    setResult(null);
    if (!subject.trim() || !body.trim()) {
      setError("Vyplň predmet aj text správy.");
      return;
    }

    setCheckingCount(true);
    try {
      const recipients = await getEmailRecipients(filter);
      const withEmail = recipients.filter((r) => r.email);
      setPreviewCount(withEmail.length);
      setConfirming(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nepodarilo sa zistiť počet príjemcov.");
    } finally {
      setCheckingCount(false);
    }
  }

  async function handleConfirmSend() {
    setSending(true);
    setError(null);
    try {
      const res = await sendKroEmail(filter, subject, body);
      setResult(`Odoslané: ${res.sent} z ${res.total}${res.failed > 0 ? ` (zlyhalo: ${res.failed})` : ""}.`);
      setConfirming(false);
      setPreviewCount(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Odoslanie zlyhalo.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
        <h2 className="mb-3 text-sm font-semibold text-zinc-600 dark:text-zinc-300">Príjemcovia</h2>

        <div className="mb-4 flex flex-wrap gap-1 rounded-lg border border-zinc-200 p-1 text-sm dark:border-zinc-800">
          {(
            [
              ["all", "Všetci rozhodcovia"],
              ["region", "Podľa regiónu"],
              ["selected", "Vybraní rozhodcovia"],
            ] as [Mode, string][]
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => changeMode(m)}
              className={`rounded-md px-3 py-1.5 font-medium transition ${
                mode === m
                  ? "bg-brand-indigo text-white"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "region" && (
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <label
                key={cat}
                className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${
                  categories.includes(cat)
                    ? "border-brand-indigo bg-brand-indigo/10 text-brand-indigo"
                    : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                }`}
              >
                <input
                  type="checkbox"
                  checked={categories.includes(cat)}
                  onChange={() => toggleCategory(cat)}
                  className="sr-only"
                />
                {CATEGORY_LABELS[cat]}
              </label>
            ))}
          </div>
        )}

        {mode === "selected" && (
          <div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Hľadať podľa mena…"
              className="mb-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-indigo dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            />
            <div className="max-h-64 overflow-y-auto rounded-lg border border-zinc-100 dark:border-zinc-900">
              {filteredReferees.length === 0 && (
                <p className="p-4 text-center text-sm text-zinc-400">Nikto sa nenašiel.</p>
              )}
              {filteredReferees.map((r) => (
                <label
                  key={r.id}
                  className="flex cursor-pointer items-center gap-2 border-b border-zinc-100 px-3 py-2 text-sm last:border-b-0 hover:bg-zinc-50 dark:border-zinc-900 dark:hover:bg-zinc-900"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(r.id)}
                    onChange={() => toggleReferee(r.id)}
                    className="rounded border-zinc-300 text-brand-indigo focus:ring-brand-indigo dark:border-zinc-700"
                  />
                  {r.full_name}
                  {r.home_region && <span className="text-xs text-zinc-400">· {r.home_region}</span>}
                </label>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-zinc-400">Vybraných: {selectedIds.size}</p>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
        <h2 className="mb-3 text-sm font-semibold text-zinc-600 dark:text-zinc-300">Správa</h2>
        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-600 dark:text-zinc-300">Predmet</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                setConfirming(false);
              }}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-indigo dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-600 dark:text-zinc-300">Text správy</label>
            <textarea
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                setConfirming(false);
              }}
              rows={8}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-indigo dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
            />
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}
        {result && (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
            {result}
          </div>
        )}

        {!confirming ? (
          <button
            type="button"
            disabled={checkingCount}
            onClick={handlePrepareSend}
            className="mt-4 rounded-lg bg-brand-indigo px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-indigo-dark disabled:opacity-60"
          >
            {checkingCount ? "Zisťujem príjemcov…" : "Pripraviť odoslanie"}
          </button>
        ) : (
          <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
              Naozaj odoslať tento e-mail {previewCount} {previewCount === 1 ? "rozhodcovi" : "rozhodcom"}?
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={sending}
                onClick={handleConfirmSend}
                className="rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {sending ? "Odosielam…" : "Áno, odoslať"}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                Zrušiť
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
