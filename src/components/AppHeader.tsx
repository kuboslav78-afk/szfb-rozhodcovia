import Image from "next/image";
import type { ReactNode } from "react";

export function AppHeader({ right }: { right?: ReactNode }) {
  return (
    <header>
      <div className="bg-brand-indigo">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-4">
          <Image
            src="/brand/szfb-logo-white.png"
            alt="Slovenský zväz florbalu"
            width={220}
            height={34}
            className="h-7 w-auto sm:h-8"
            priority
          />
          {right}
        </div>
      </div>
      <div className="h-[6px] bg-brand-red" />
    </header>
  );
}
