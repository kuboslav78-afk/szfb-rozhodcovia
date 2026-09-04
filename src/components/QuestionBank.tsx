"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteQuestion,
  importQuestions,
  setQuestionActive,
  setTestingEnabled,
} from "@/app/testovanie/actions";

export type BankQuestion = {
  id: string;
  question: string;
  topic: string | null;
  rule_reference: string | null;
  video_url: string | null;
  active: boolean;
  answerCount: number;
};

type Props = {
  questions: BankQuestion[];
  enabled: boolean;
};

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function QuestionBank({ questions, enabled }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [json, setJson] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(enabled);

  const query = normalize(search.trim());
  const visible = query
    ? questions.filter(
        (q) =>
          normalize(q.question).includes(query) ||
          normalize(q.topic ?? "").includes(query) ||
          (q.rule_reference ?? "").includes(query),
      )
    : questions;

  const activeCount = questions.filter((q) => q.active).length;

  async function run(fn: () => Promise<string>) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      setMessage(await fn());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Akcia zlyhala.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div
        className={`rounded-xl border p-5 ${
          live
            ? "border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950"
            : "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="font-semibold text-zinc-800 dark:text-zinc-100">
              {live ? "Testovanie je spustené" : "Testovanie je skryté"}
            </div>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
              {live
                ? `Rozhodcovia dostávajú každý týždeň 10 otázok z ${activeCount} aktívnych.`
                : "Modul vidíš zatiaľ len ty. Rozhodcom sa v menu ukazuje ako „Čoskoro“."}
            </p>
          </div>
          <button
            type="button"
            disabled={busy || (!live && activeCount < 10)}
            onClick={() =>
              run(async () => {
                await setTestingEnabled(!live);
                setLive(!live);
                return !live ? "Testovanie sprístupnené rozhodcom." : "Testovanie skryté.";
              })
            }
            className="shrink-0 rounded-lg bg-brand-indigo px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-indigo-dark disabled:opacity-50"
          >
            {live ? "Skryť rozhodcom" : "Sprístupniť rozhodcom"}
          </button>
        </div>
        {!live && activeCount < 10 && (
          <p className="mt-2 text-xs text-amber-800 dark:text-amber-400">
            Na spustenie treba aspoň 10 aktívnych otázok — teraz ich je {activeCount}.
          </p>
        )}
      </div>

      <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
          Import otázok
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Vlož JSON — buď pole otázok, alebo celý súbor s kľúčom{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">questions</code>.
          Rozpozná aj tvar s{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">options</code> a{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">correctAnswerIndex</code>.
          Video sa pridáva cez{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">videoUrl</code>.
        </p>
        <textarea
          value={json}
          onChange={(e) => setJson(e.target.value)}
          rows={5}
          placeholder='[{"question":"…","options":["A","B"],"correctAnswerIndex":0,"explanation":"…"}]'
          className="mt-3 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-xs outline-none focus:border-brand-indigo dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
        />
        <button
          type="button"
          disabled={busy || !json.trim()}
          onClick={() =>
            run(async () => {
              const { imported } = await importQuestions(json);
              setJson("");
              return `Naimportovaných ${imported} otázok.`;
            })
          }
          className="mt-3 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {busy ? "Importujem…" : "Importovať"}
        </button>
      </div>

      {message && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
            Banka otázok
          </h2>
          <span className="text-xs text-zinc-400">
            {activeCount} aktívnych z {questions.length}
          </span>
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Hľadať v otázkach, témach alebo číslach pravidiel…"
          className="mt-3 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-indigo dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
        />

        <div className="mt-4 flex flex-col gap-px bg-zinc-100 dark:bg-zinc-900">
          {visible.map((q) => (
            <div
              key={q.id}
              className="flex items-start gap-3 bg-white px-1 py-3 dark:bg-zinc-950"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm text-zinc-800 dark:text-zinc-200">{q.question}</div>
                <div className="mt-0.5 flex flex-wrap gap-2 text-[11px] text-zinc-400">
                  {q.topic && <span>{q.topic}</span>}
                  {q.rule_reference && <span>· pravidlo {q.rule_reference}</span>}
                  <span>· {q.answerCount} možností</span>
                  {q.video_url && <span>· 🎬 video</span>}
                  {!q.active && (
                    <span className="font-semibold text-amber-600">· vyradená</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await setQuestionActive(q.id, !q.active);
                    return q.active ? "Otázka vyradená." : "Otázka vrátená do banky.";
                  })
                }
                className="shrink-0 rounded-md border border-zinc-200 px-2 py-1 text-[11px] text-zinc-500 transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                {q.active ? "Vyradiť" : "Vrátiť"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (!window.confirm("Naozaj zmazať túto otázku aj s odpoveďami?")) return;
                  run(async () => {
                    await deleteQuestion(q.id);
                    return "Otázka zmazaná.";
                  });
                }}
                className="shrink-0 text-zinc-300 transition hover:text-red-600 dark:text-zinc-600"
                title="Zmazať"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {visible.length === 0 && (
          <p className="py-8 text-center text-sm text-zinc-400">
            {questions.length === 0
              ? "Banka je zatiaľ prázdna — naimportuj otázky vyššie."
              : "Nič nezodpovedá hľadaniu."}
          </p>
        )}
      </div>
    </div>
  );
}
