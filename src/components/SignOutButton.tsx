import { signOut } from "@/app/logout/actions";

export function SignOutButton() {
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
