import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { AppHeader } from "@/components/AppHeader";
import { SignOutButton } from "@/components/SignOutButton";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";

export default async function ProfilPage() {
  const referee = await requireUser();

  return (
    <>
      <AppHeader
        right={
          <div className="flex items-center gap-4">
            <p className="hidden text-sm font-medium text-white sm:block">
              {referee.full_name}
              {referee.role === "admin" ? " · admin" : ""}
            </p>
            <SignOutButton />
          </div>
        }
      />

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-10">
        <Link
          href="/"
          className="mb-6 inline-block text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          ← Späť na kalendár
        </Link>

        <h1 className="mb-6 text-lg font-semibold text-zinc-800 dark:text-zinc-100">
          Môj profil
        </h1>

        <div className="mb-6 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Meno</dt>
              <dd className="font-medium text-zinc-800 dark:text-zinc-200">
                {referee.full_name}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">E-mail</dt>
              <dd className="font-medium text-zinc-800 dark:text-zinc-200">
                {referee.email}
              </dd>
            </div>
          </dl>
        </div>

        <ChangePasswordForm />
      </main>
    </>
  );
}
