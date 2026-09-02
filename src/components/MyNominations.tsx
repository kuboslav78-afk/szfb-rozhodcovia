"use client";

import { useState, useTransition } from "react";
import { respondToNomination } from "@/app/nominations/actions";

export type MyNomination = {
  id: string;
  matchNumber: number | null;
  league: string;
  teamHome: string;
  teamAway: string;
  matchDate: string;
  matchTime: string | null;
  venue: string | null;
  myStatus: "sent" | "confirmed" | "rejected";
  partnerName: string | null;
};

const STATUS_LABELS: Record<MyNomination["myStatus"], string> = {
  sent: "Čaká na tvoje potvrdenie",
  confirmed: "Potvrdil/a si",
  rejected: "Zamietol/la si",
};

const STATUS_CLASSES: Record<MyNomination["myStatus"], string> = {
  sent: "border-amber-400 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300",
  confirmed:
    "border-emerald-400 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  rejected: "border-red-400 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-950 dark:text-red-300",
};

function formatDateLabel(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("sk-SK", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function NominationCard({ nomination }: { nomination: MyNomination }) {
  const [isPending, startTransition] = useTransition();
  const [localStatus, setLocalStatus] = useState(nomination.myStatus);
  const [error, setError] = useState<string | null>(null);

  function respond(response: "confirmed" | "rejected") {
    setError(null);
    startTransition(async () => {
      try {
        await respondToNomination(nomination.id, response);
        setLocalStatus(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Nastala chyba.");
      }
    });
  }

  return (
    <div className={`rounded-xl border p-4 ${STATUS_CLASSES[localStatus]}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
            {formatDateLabel(nomination.matchDate)}
            {nomination.matchTime && ` · ${nomination.matchTime}`}
          </p>
          <p className="mt-1 text-base font-semibold text-zinc-800 dark:text-zinc-100">
            {nomination.teamHome} <span className="opacity-50">vs</span> {nomination.teamAway}
          </p>
          <p className="mt-0.5 text-sm text-zinc-500">
            {nomination.venue ?? "miesto zatiaľ neurčené"}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            {nomination.league}
            {nomination.matchNumber != null && ` · Č.z. ${nomination.matchNumber}`}
            {nomination.partnerName && ` · s ${nomination.partnerName}`}
          </p>
        </div>
        <span className="shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold">
          {STATUS_LABELS[localStatus]}
        </span>
      </div>

      {localStatus === "sent" && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => respond("confirmed")}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            Potvrdiť
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => respond("rejected")}
            className="rounded-lg border border-red-400 px-3 py-1.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:hover:bg-red-950"
          >
            Zamietnuť
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function MyNominations({ nominations }: { nominations: MyNomination[] }) {
  if (nominations.length === 0) {
    return (
      <p className="rounded-xl border border-zinc-200 p-6 text-center text-sm text-zinc-400 dark:border-zinc-800">
        Zatiaľ nemáš žiadne odoslané nominácie.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {nominations.map((n) => (
        <NominationCard key={n.id} nomination={n} />
      ))}
    </div>
  );
}
