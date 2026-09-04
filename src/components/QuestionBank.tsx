"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteQuestion,
  importQuestions,
  saveQuestion,
  setQuestionActive,
  setTestingEnabled,
} from "@/app/testovanie/actions";

export type BankQuestion = {
  id: string;
  question: string;
  topic: string | null;
  rule_reference: string | null;
  video_url: string | null;
  explanation: string | null;
  active: boolean;
  answers: { answer: string; isCorrect: boolean }[];
};

type Props = {
  questions: BankQuestion[];
  enabled: boolean;
  /** Členovia KRO bez admin práv banku vidia, ale nemenia. */
  readOnly?: boolean;
};

const EMPTY_DRAFT = {
  question: "",
  topic: "",
  ruleReference: "",
  videoUrl: "",
  explanation: "",
  answers: ["", "", "", ""],
  correctIndex: 0,
};

type Draft = typeof EMPTY_DRAFT;

function QuestionEditor({
  draft,
  onChange,
  onSave,
  onCancel,
  busy,
}: {
  draft: Draft;
  onChange: (next: Draft) => void;
  onSave: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const field =
    "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-indigo dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200";

  return (
    <div className="rounded-xl border border-brand-indigo/40 bg-brand-indigo/5 p-4">
      <textarea
        value={draft.question}
        onChange={(e) => onChange({ ...draft, question: e.target.value })}
        rows={2}
        placeholder="Znenie otázky"
        className={field}
      />

      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <input
          type="text"
          value={draft.topic}
          onChange={(e) => onChange({ ...draft, topic: e.target.value })}
          placeholder="Kategória"
          className={field}
        />
        <input
          type="text"
          value={draft.ruleReference}
          onChange={(e) => onChange({ ...draft, ruleReference: e.target.value })}
          placeholder="Zdroj (napr. 701 alebo slajd 23)"
          className={field}
        />
        <input
          type="text"
          value={draft.videoUrl}
          onChange={(e) => onChange({ ...draft, videoUrl: e.target.value })}
          placeholder="Odkaz na video (voliteľné)"
          className={field}
        />
      </div>

      <p className="mt-3 mb-1 text-xs font-medium text-zinc-500">
        Možnosti — bodkou vľavo označ tú správnu
      </p>
      <div className="flex flex-col gap-1.5">
        {draft.answers.map((answer, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="radio"
              name="correct"
              checked={draft.correctIndex === i}
              onChange={() => onChange({ ...draft, correctIndex: i })}
              className="accent-brand-indigo"
            />
            <input
              type="text"
              value={answer}
              onChange={(e) => {
                const answers = [...draft.answers];
                answers[i] = e.target.value;
                onChange({ ...draft, answers });
              }}
              placeholder={`Možnosť ${i + 1}`}
              className={field}
            />
            {draft.answers.length > 2 && (
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...draft,
                    answers: draft.answers.filter((_, k) => k !== i),
                    correctIndex:
                      draft.correctIndex > i
                        ? draft.correctIndex - 1
                        : Math.min(draft.correctIndex, draft.answers.length - 2),
                  })
                }
                className="shrink-0 text-zinc-300 transition hover:text-red-600 dark:text-zinc-600"
                title="Odobrať možnosť"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange({ ...draft, answers: [...draft.answers, ""] })}
        className="mt-1.5 text-xs text-brand-indigo hover:underline"
      >
        + ďalšia možnosť
      </button>

      <textarea
        value={draft.explanation}
        onChange={(e) => onChange({ ...draft, explanation: e.target.value })}
        rows={2}
        placeholder="Vysvetlenie — rozhodca ho uvidí až po odoslaní testu"
        className={`${field} mt-3`}
      />

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onSave}
          className="rounded-lg bg-brand-indigo px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-indigo-dark disabled:opacity-60"
        >
          {busy ? "Ukladám…" : "Uložiť"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Zrušiť
        </button>
      </div>
    </div>
  );
}

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function QuestionBank({ questions, enabled, readOnly = false }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [json, setJson] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(enabled);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [allOpen, setAllOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);

  function startEdit(q: BankQuestion) {
    setEditing(q.id);
    setDraft({
      question: q.question,
      topic: q.topic ?? "",
      ruleReference: q.rule_reference ?? "",
      videoUrl: q.video_url ?? "",
      explanation: q.explanation ?? "",
      answers: q.answers.map((a) => a.answer),
      correctIndex: Math.max(0, q.answers.findIndex((a) => a.isCorrect)),
    });
  }

  function persist(questionId?: string) {
    run(async () => {
      await saveQuestion(
        {
          question: draft.question,
          topic: draft.topic,
          ruleReference: draft.ruleReference,
          videoUrl: draft.videoUrl,
          explanation: draft.explanation,
          answers: draft.answers
            .map((answer, i) => ({ answer, correct: i === draft.correctIndex }))
            .filter((a) => a.answer.trim()),
        },
        questionId,
      );
      setEditing(null);
      setDraft(EMPTY_DRAFT);
      return questionId ? "Otázka upravená." : "Otázka pridaná.";
    });
  }

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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
      {!readOnly && (
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
      )}

      {!readOnly && (
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
      )}

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
          <div className="flex items-center gap-3">
            {!readOnly && (
            <button
              type="button"
              onClick={() => {
                setEditing("new");
                setDraft(EMPTY_DRAFT);
              }}
              className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              + Pridať otázku
            </button>
            )}
            <button
              type="button"
              onClick={() => {
                setAllOpen(!allOpen);
                setOpen(allOpen ? new Set() : new Set(questions.map((q) => q.id)));
              }}
              className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {allOpen ? "Zbaliť všetko" : "Rozbaliť všetko"}
            </button>
            <span className="text-xs text-zinc-400">
              {activeCount} aktívnych z {questions.length}
            </span>
          </div>
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Hľadať v otázkach, témach alebo číslach pravidiel…"
          className="mt-3 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-indigo dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
        />

        {editing === "new" && (
          <div className="mt-4">
            <QuestionEditor
              draft={draft}
              onChange={setDraft}
              onSave={() => persist()}
              onCancel={() => setEditing(null)}
              busy={busy}
            />
          </div>
        )}

        <div className="mt-4 flex flex-col gap-px bg-zinc-100 dark:bg-zinc-900">
          {visible.map((q, index) =>
            editing === q.id ? (
              <div key={q.id} className="bg-white py-3 dark:bg-zinc-950">
                <QuestionEditor
                  draft={draft}
                  onChange={setDraft}
                  onSave={() => persist(q.id)}
                  onCancel={() => setEditing(null)}
                  busy={busy}
                />
              </div>
            ) : (
            <div key={q.id} className="flex items-start gap-3 bg-white px-1 py-3 dark:bg-zinc-950">
              <button
                type="button"
                onClick={() => toggle(q.id)}
                className="min-w-0 flex-1 text-left"
              >
                <div className="text-sm text-zinc-800 dark:text-zinc-200">
                  <span className="mr-1.5 text-zinc-400">{index + 1}.</span>
                  {q.question}
                </div>
                <div className="mt-0.5 flex flex-wrap gap-2 text-[11px] text-zinc-400">
                  {q.topic && <span>{q.topic}</span>}
                  {q.rule_reference && <span>· {q.rule_reference}</span>}
                  <span>· {q.answers.length} možností</span>
                  {q.video_url && <span>· 🎬 video</span>}
                  {!q.active && (
                    <span className="font-semibold text-amber-600">· vyradená</span>
                  )}
                  <span className="text-zinc-300 dark:text-zinc-600">
                    {open.has(q.id) ? "▲" : "▼"}
                  </span>
                </div>

                {open.has(q.id) && (
                  <div className="mt-2 flex flex-col gap-1 border-l-2 border-zinc-100 pl-3 dark:border-zinc-800">
                    {q.answers.map((a, i) => (
                      <div
                        key={i}
                        className={`text-xs ${
                          a.isCorrect
                            ? "font-semibold text-emerald-700 dark:text-emerald-400"
                            : "text-zinc-500"
                        }`}
                      >
                        {a.isCorrect ? "✓" : "○"} {a.answer}
                      </div>
                    ))}
                    {q.explanation && (
                      <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500 italic">
                        {q.explanation}
                      </p>
                    )}
                    {q.video_url && (
                      <a
                        href={q.video_url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1 text-[11px] text-brand-indigo hover:underline"
                      >
                        {q.video_url}
                      </a>
                    )}
                  </div>
                )}
              </button>
              {!readOnly && (
              <>
              <button
                type="button"
                disabled={busy}
                onClick={() => startEdit(q)}
                className="shrink-0 rounded-md border border-zinc-200 px-2 py-1 text-[11px] text-zinc-500 transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                Upraviť
              </button>
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
              </>
              )}
            </div>
            ),
          )}
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
