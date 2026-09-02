import { PageTitle } from "@/components/PageTitle";

export function ComingSoonSection({ title }: { title: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 px-6 py-20 text-center dark:border-zinc-800">
      <p className="text-xs font-bold uppercase tracking-widest text-brand-indigo">Čoskoro</p>
      <PageTitle className="mt-2">{title}</PageTitle>
      <p className="mt-2 max-w-sm text-sm text-zinc-500">
        Táto sekcia sa pripravuje. Zatiaľ tu nie je žiadny obsah.
      </p>
    </div>
  );
}
