import { signOut } from "@/app/logout/actions";

export function SignOutButton({ compact }: { compact?: boolean } = {}) {
  if (compact) {
    return (
      <form action={signOut}>
        <button
          type="submit"
          aria-label="Odhlásiť sa"
          title="Odhlásiť sa"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4.5 w-4.5"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="M16 17l5-5-5-5M21 12H9" />
          </svg>
        </button>
      </form>
    );
  }

  return (
    <form action={signOut}>
      <button
        type="submit"
        className="rounded-lg border border-white/30 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/10"
      >
        Odhlásiť sa
      </button>
    </form>
  );
}
