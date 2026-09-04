"use client";

import { useState } from "react";
import {
  loadTestQuestions,
  startWeeklyTest,
  submitTest,
  type TestQuestion,
} from "@/app/testovanie/actions";

/** Prevedie odkaz na YouTube/Vimeo na vloženiteľnú podobu. */
function embedUrl(url: string): string | null {
  const youtube = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/,
  );
  if (youtube) return `https://www.youtube.com/embed/${youtube[1]}`;

  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;

  return null;
}

function QuestionVideo({ url }: { url: string }) {
  const embed = embedUrl(url);

  if (!embed) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-block text-sm text-brand-indigo hover:underline"
      >
        Otvoriť video →
      </a>
    );
  }

  return (
    <div className="mt-3 aspect-video w-full max-w-2xl overflow-hidden rounded-lg bg-black">
      <iframe
        src={embed}
        title="Video k otázke"
        allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
        allowFullScreen
        className="h-full w-full"
      />
    </div>
  );
}

type Props = {
  /** Test tohto týždňa, ak už bol založený. */
  assignmentId: string | null;
  submitted: boolean;
  score: number | null;
  weekLabel: string;
};

export function WeeklyTest({ assignmentId, submitted, score, weekLabel }: Props) {
  const [id, setId] = useState(assignmentId);
  const [questions, setQuestions] = useState<TestQuestion[] | null>(null);
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [done, setDone] = useState(submitted);
  const [result, setResult] = useState<number | null>(score);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setBusy(true);
    setError(null);
    try {
      const assignment = id ?? (await startWeeklyTest());
      setId(assignment);
      const loaded = await loadTestQuestions(assignment);
      setQuestions(loaded);
      setChosen(
        Object.fromEntries(
          loaded
            .filter((q) => q.chosenAnswerId)
            .map((q) => [q.id, q.chosenAnswerId as string]),
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Test sa nepodarilo načítať.");
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    if (!id || !questions) return;

    const unanswered = questions.filter((q) => !chosen[q.id]).length;
    if (
      unanswered > 0 &&
      !window.confirm(
        `${unanswered} ${unanswered === 1 ? "otázka nie je zodpovedaná" : "otázok nie je zodpovedaných"}. Odoslať aj tak? Test sa dá odoslať len raz.`,
      )
    ) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const points = await submitTest(
        id,
        questions.map((q) => ({ questionId: q.id, answerId: chosen[q.id] ?? null })),
      );
      setResult(points);
      setDone(true);
      setQuestions(await loadTestQuestions(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Odoslanie zlyhalo.");
    } finally {
      setBusy(false);
    }
  }

  if (!questions) {
    return (
      <div className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
        <div className="font-semibold text-zinc-800 dark:text-zinc-100">
          Test na týždeň od {weekLabel}
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          {done
            ? `Tento týždeň už máš test odoslaný — získal/a si ${result} z 10 bodov.`
            : "Desať otázok z pravidiel florbalu. Odoslať sa dá raz, potom uvidíš správne odpovede aj vysvetlenia."}
        </p>
        {error && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={open}
          className="mt-4 rounded-lg bg-brand-indigo px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-indigo-dark disabled:opacity-60"
        >
          {busy ? "Načítavam…" : done ? "Zobraziť výsledok" : "Spustiť test"}
        </button>
      </div>
    );
  }

  return (
    <div>
      {done && (
        <div
          className={`mb-6 rounded-xl border p-5 ${
            (result ?? 0) >= 8
              ? "border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950"
              : "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950"
          }`}
        >
          <div className="font-headline text-2xl text-zinc-800 dark:text-zinc-100">
            {result} / {questions.length}
          </div>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            Test je odoslaný. Pri každej otázke vidíš správnu odpoveď aj vysvetlenie.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {questions.map((q, index) => (
          <div
            key={q.id}
            className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800"
          >
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
              <span className="font-semibold text-zinc-500">Otázka {index + 1}</span>
              {q.topic && <span>· {q.topic}</span>}
              {q.ruleReference && <span>· pravidlo {q.ruleReference}</span>}
            </div>

            <p className="mt-2 font-medium text-zinc-800 dark:text-zinc-100">{q.question}</p>

            {q.videoUrl && <QuestionVideo url={q.videoUrl} />}

            <div className="mt-4 flex flex-col gap-2">
              {q.answers.map((a) => {
                const picked = chosen[q.id] === a.id;
                const correct = a.isCorrect === true;
                const wrongPick = done && picked && !correct;

                return (
                  <label
                    key={a.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-2.5 text-sm transition ${
                      done && correct
                        ? "border-emerald-400 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950"
                        : wrongPick
                          ? "border-red-400 bg-red-50 dark:border-red-700 dark:bg-red-950"
                          : picked
                            ? "border-brand-indigo bg-brand-indigo/5"
                            : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                    }`}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      checked={picked}
                      disabled={done}
                      onChange={() => setChosen((prev) => ({ ...prev, [q.id]: a.id }))}
                      className="mt-0.5 accent-brand-indigo"
                    />
                    <span className="text-zinc-700 dark:text-zinc-200">{a.answer}</span>
                  </label>
                );
              })}
            </div>

            {done && q.explanation && (
              <p className="mt-3 rounded-lg bg-zinc-50 px-3 py-2 text-xs leading-relaxed text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                {q.explanation}
              </p>
            )}
          </div>
        ))}
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {!done && (
        <button
          type="button"
          disabled={busy}
          onClick={send}
          className="mt-6 rounded-lg bg-brand-indigo px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-indigo-dark disabled:opacity-60"
        >
          {busy ? "Odosielam…" : "Odoslať test"}
        </button>
      )}
    </div>
  );
}
