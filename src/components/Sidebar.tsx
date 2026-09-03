"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode, type SVGProps } from "react";
import { SignOutButton } from "@/components/SignOutButton";
import { setViewMode } from "@/app/view-mode/actions";

export type NavKey =
  | "prehlad"
  | "dostupnost"
  | "nominacie"
  | "vzdelavanie"
  | "testovanie"
  | "administracia"
  | "kro";

type IconProps = SVGProps<SVGSVGElement>;

function GridIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </svg>
  );
}

function CalendarIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M8 2.5v4M16 2.5v4M3 9.5h18" />
    </svg>
  );
}

function ClipboardIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

function BookIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
    </svg>
  );
}

function ChecklistIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m3 7 2 2 3-3" />
      <path d="m3 15 2 2 3-3" />
      <path d="M11 7h10M11 15h10" />
    </svg>
  );
}

function ShieldIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 2 4 5.5v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10v-6L12 2Z" />
    </svg>
  );
}

function UsersIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7" />
      <path d="M21.5 20c0-3-2-5.5-4.8-6.3" />
    </svg>
  );
}

function MenuIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CloseIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M18 6 6 18M6 6l18 18" />
    </svg>
  );
}

type NavItem = {
  key: NavKey;
  href: string;
  label: string;
  icon: (props: IconProps) => ReactNode;
  badge?: number;
  soon?: boolean;
};

type Props = {
  current: NavKey | null;
  refereeName: string;
  roleLabel: string | null;
  isAdmin: boolean;
  pendingNominations: number;
  /** Skutočná rola je admin — riadi, či sa vôbec zobrazí prepínač pohľadu. */
  canToggleView?: boolean;
  /** Aktuálny (UI) pohľad, relevantný len keď canToggleView je true. */
  viewMode?: "admin" | "referee";
  /** KRO sekcia (roster, e-mail) — viditeľná pre adminov aj pre viewer účty (napr. demo pre vedenie). */
  canSeeKro?: boolean;
};

function Brand() {
  return (
    <Link href="/" className="flex items-center bg-brand-indigo px-5 py-4">
      <Image
        src="/brand/szfb-logo-white.png"
        alt="Slovenský zväz florbalu"
        width={220}
        height={34}
        className="h-7 w-auto"
        priority
      />
    </Link>
  );
}

function NavLink({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate?: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`flex items-center gap-3 border-l-[3px] py-2.5 pr-3 pl-3 text-xs font-bold tracking-wide uppercase transition ${
        active
          ? "border-brand-indigo bg-brand-indigo/8 text-brand-indigo dark:bg-brand-indigo/15"
          : "border-transparent text-zinc-500 hover:border-zinc-200 hover:bg-zinc-50 hover:text-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-800 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
      }`}
    >
      <Icon className="h-4.5 w-4.5 shrink-0" />
      <span className="flex-1">{item.label}</span>
      {item.soon && (
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide ${
            active ? "bg-brand-indigo/15 text-brand-indigo" : "bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
          }`}
        >
          Čoskoro
        </span>
      )}
      {!item.soon && item.badge ? (
        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand-red px-1 text-[11px] font-bold text-white">
          {item.badge}
        </span>
      ) : null}
    </Link>
  );
}

function Nav({
  current,
  isAdmin,
  canSeeKro,
  pendingNominations,
  onNavigate,
}: {
  current: NavKey | null;
  isAdmin: boolean;
  canSeeKro: boolean;
  pendingNominations: number;
  onNavigate?: () => void;
}) {
  const items: NavItem[] = [
    { key: "prehlad", href: "/", label: "Prehľad", icon: GridIcon },
    { key: "dostupnost", href: "/dostupnost", label: "Dostupnosť", icon: CalendarIcon },
    { key: "nominacie", href: "/nominations", label: "Nominácie", icon: ClipboardIcon, badge: pendingNominations },
    { key: "vzdelavanie", href: "/vzdelavanie", label: "Vzdelávanie", icon: BookIcon, soon: true },
    { key: "testovanie", href: "/testovanie", label: "Testovanie", icon: ChecklistIcon, soon: true },
  ];

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => (
        <NavLink key={item.key} item={item} active={current === item.key} onNavigate={onNavigate} />
      ))}
      {(canSeeKro || isAdmin) && <div className="my-2 h-px bg-zinc-100 dark:bg-zinc-900" />}
      {canSeeKro && (
        <NavLink
          item={{ key: "kro", href: "/kro", label: "KRO", icon: UsersIcon }}
          active={current === "kro"}
          onNavigate={onNavigate}
        />
      )}
      {isAdmin && (
        <NavLink
          item={{ key: "administracia", href: "/dostupnost?view=admin", label: "Administrácia", icon: ShieldIcon }}
          active={current === "administracia"}
          onNavigate={onNavigate}
        />
      )}
    </nav>
  );
}

function ViewModeToggle({ viewMode }: { viewMode: "admin" | "referee" }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function switchTo(mode: "admin" | "referee") {
    if (mode === viewMode || isPending) return;
    startTransition(async () => {
      await setViewMode(mode);
      router.refresh();
    });
  }

  return (
    <div className="mx-4 mb-3 flex rounded-lg border border-zinc-200 p-0.5 text-xs font-bold tracking-wide uppercase dark:border-zinc-800">
      <button
        type="button"
        disabled={isPending}
        onClick={() => switchTo("admin")}
        className={`flex-1 rounded-md px-2 py-1.5 transition ${
          viewMode === "admin"
            ? "bg-brand-indigo text-white"
            : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
        }`}
      >
        Admin
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => switchTo("referee")}
        className={`flex-1 rounded-md px-2 py-1.5 transition ${
          viewMode === "referee"
            ? "bg-brand-indigo text-white"
            : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
        }`}
      >
        Rozhodca
      </button>
    </div>
  );
}

function UserFooter({ refereeName, roleLabel }: { refereeName: string; roleLabel: string | null }) {
  const initial = refereeName.trim().charAt(0).toUpperCase() || "?";
  return (
    <div className="flex items-center gap-3 border-t border-zinc-100 p-4 dark:border-zinc-900">
      <Link
        href="/profil"
        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg transition hover:opacity-80"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-indigo/10 text-sm font-bold text-brand-indigo">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">{refereeName}</p>
          {roleLabel && <p className="truncate text-xs text-zinc-400">{roleLabel}</p>}
        </div>
      </Link>
      <SignOutButton compact />
    </div>
  );
}

export function Sidebar({
  current,
  refereeName,
  roleLabel,
  isAdmin,
  pendingNominations,
  canToggleView,
  viewMode,
  canSeeKro,
}: Props) {
  const showKro = canSeeKro ?? isAdmin;
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 lg:hidden">
        <div className="flex items-center justify-between bg-brand-indigo px-4 py-3">
          <Link href="/" className="flex items-center">
            <Image
              src="/brand/szfb-logo-white.png"
              alt="Slovenský zväz florbalu"
              width={180}
              height={28}
              className="h-6 w-auto"
              priority
            />
          </Link>
          <button
            type="button"
            aria-label="Otvoriť menu"
            onClick={() => setOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/30 text-white transition hover:bg-white/10"
          >
            <MenuIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="h-[4px] bg-brand-red" />
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Zavrieť menu"
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <div className="relative flex h-full w-72 flex-col bg-white dark:bg-zinc-950">
            <div className="flex items-center justify-between bg-brand-indigo px-5 py-4">
              <Image
                src="/brand/szfb-logo-white.png"
                alt="Slovenský zväz florbalu"
                width={180}
                height={28}
                className="h-6 w-auto"
              />
              <button
                type="button"
                aria-label="Zavrieť menu"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/30 text-white transition hover:bg-white/10"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="h-[4px] bg-brand-red" />
            {canToggleView && viewMode && (
              <div className="pt-3">
                <ViewModeToggle viewMode={viewMode} />
              </div>
            )}
            <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
              <Nav
                current={current}
                isAdmin={isAdmin}
                canSeeKro={showKro}
                pendingNominations={pendingNominations}
                onNavigate={() => setOpen(false)}
              />
            </div>
            <UserFooter refereeName={refereeName} roleLabel={roleLabel} />
          </div>
        </div>
      )}

      <aside className="sticky top-0 z-40 hidden h-screen w-64 shrink-0 flex-col border-r border-zinc-100 bg-white dark:border-zinc-900 dark:bg-zinc-950 lg:flex">
        <Brand />
        <div className="h-[4px] bg-brand-red" />
        {canToggleView && viewMode && (
          <div className="pt-3">
            <ViewModeToggle viewMode={viewMode} />
          </div>
        )}
        <div className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
          <Nav current={current} isAdmin={isAdmin} canSeeKro={showKro} pendingNominations={pendingNominations} />
        </div>
        <UserFooter refereeName={refereeName} roleLabel={roleLabel} />
      </aside>
    </>
  );
}
