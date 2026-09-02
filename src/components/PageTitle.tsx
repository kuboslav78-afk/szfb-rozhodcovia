import type { ReactNode } from "react";

export function PageTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <h1 className={`font-headline text-2xl tracking-tight text-zinc-900 uppercase dark:text-zinc-50 ${className}`}>
      {children}
    </h1>
  );
}
