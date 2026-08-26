"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { REGIONS, CATEGORY_LABELS, type Category, type Region } from "@/lib/categories";
import { setMyRegion } from "@/app/referee-categories/actions";

type Props = {
  activeCategory?: Category;
  primaryCategory?: Category;
  monthParam: string;
};

export function RegionSwitcher({ activeCategory, primaryCategory, monthParam }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const choices = REGIONS.filter(
    (r) => r !== activeCategory && r !== primaryCategory,
  );
  const showPrimaryLink =
    primaryCategory && primaryCategory !== activeCategory;

  if (!open) {
    return (
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {showPrimaryLink && (
          <a
            href={`/?month=${monthParam}&view=moje&category=${primaryCategory}`}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            ← {CATEGORY_LABELS[primaryCategory]}
          </a>
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          + Ponúknuť termín v inom regióne
        </button>
      </div>
    );
  }

  function handlePick(region: Region) {
    startTransition(async () => {
      await setMyRegion(region, true);
      router.push(`/?month=${monthParam}&view=moje&category=${region}`);
      setOpen(false);
    });
  }

  return (
    <div className="mb-6 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
          V ktorom regióne chceš ešte ponúknuť termín?
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
        >
          Zrušiť
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {showPrimaryLink && (
          <a
            href={`/?month=${monthParam}&view=moje&category=${primaryCategory}`}
            className="rounded-full border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:border-brand-indigo hover:bg-brand-indigo/10 hover:text-brand-indigo dark:border-zinc-700 dark:text-zinc-300 dark:hover:text-white"
          >
            ← {CATEGORY_LABELS[primaryCategory]}
          </a>
        )}
        {choices.map((region) => (
          <button
            key={region}
            type="button"
            disabled={isPending}
            onClick={() => handlePick(region)}
            className="rounded-full border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:border-brand-indigo hover:bg-brand-indigo/10 hover:text-brand-indigo disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:text-white"
          >
            {CATEGORY_LABELS[region]}
          </button>
        ))}
      </div>
    </div>
  );
}
