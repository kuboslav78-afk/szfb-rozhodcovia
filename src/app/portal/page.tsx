import Image from "next/image";

const FEATURES = [
  {
    n: "01",
    title: "Delegačný kalendár",
    text: "Delegácie podľa regiónu a súťaže, potvrdenie účasti jedným klikom, export do kalendára.",
  },
  {
    n: "02",
    title: "Profil a licencia",
    text: "Stupeň N/C/B/A, platnosť licencie, história zápasov aj napredovanie kariéry na jednom mieste.",
  },
  {
    n: "03",
    title: "Hodnotenia od observerov",
    text: "Spätná väzba hneď po zápase, štatistiky výkonu a jasná cesta k vyššej licencii.",
  },
  {
    n: "04",
    title: "E-learning a pravidlá",
    text: "Videá, testy a aktualizácie pravidiel IFF — kedykoľvek, odkiaľkoľvek, bez cestovania na školenie.",
  },
  {
    n: "05",
    title: "Odmeny a fakturácia",
    text: "Prehľad odmien za odpískané zápasy, história platieb, doklady na stiahnutie.",
  },
  {
    n: "06",
    title: "Dokumenty na jednom mieste",
    text: "Pravidlá, výklad pravidiel, zápisy o zápase a tlačivá vždy v aktuálnej verzii.",
  },
  {
    n: "07",
    title: "Priama linka na KRO",
    text: "Novinky komisie, oznamy o zmenách a rýchly kontakt na komisiu rozhodcov.",
  },
  {
    n: "08",
    title: "Mobilný prístup",
    text: "Delegácie a informácie o zápase priamo v šatni, na telefóne.",
  },
];

const LICENCE_PATH = [
  {
    level: "N",
    title: "Mládežnícke súťaže",
    text: "Vstupná licencia po školení pre nováčikov, 15+ rokov.",
  },
  {
    level: "C",
    title: "Regionálna úroveň",
    text: "Zápasy v rámci regiónu — Bratislava, Západ, Stred, Východ.",
  },
  {
    level: "B",
    title: "Celoštátna úroveň",
    text: "Celoslovenské súťaže, vyššie odmeny, hodnotenie observermi.",
  },
  {
    level: "A",
    title: "Extraliga",
    text: "Najvyššia domáca súťaž a odrazový mostík k medzinárodným nomináciám.",
  },
];

export default function PortalLandingPage() {
  return (
    <>
      <header>
        <div className="bg-brand-indigo">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5 lg:px-16">
            <Image
              src="/brand/szfb-logo-white.png"
              alt="Slovenský zväz florbalu"
              width={220}
              height={34}
              className="h-7 w-auto sm:h-8"
              priority
            />
            <div className="flex items-center gap-8">
              <nav className="hidden items-center gap-8 text-sm font-medium text-white/80 lg:flex">
                <span>O portáli</span>
                <span>Ako sa stať rozhodcom</span>
                <span>Delegácie</span>
                <span>Vzdelávanie</span>
                <span>Kontakt</span>
              </nav>
              <a
                href="/login"
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-indigo transition hover:bg-white/90"
              >
                Prihlásiť sa
              </a>
            </div>
          </div>
        </div>
        <div className="h-[6px] bg-brand-red" />
      </header>

      <main className="flex-1 bg-white dark:bg-zinc-950">
        {/* HERO */}
        <div className="mx-auto flex max-w-7xl flex-col gap-12 px-6 py-16 lg:flex-row lg:items-start lg:px-16 lg:py-24">
          <div className="flex-1">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-zinc-200 px-3.5 py-1.5 text-xs font-medium text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              <span className="h-2 w-2 rounded-full bg-brand-red" />
              Portál Komisie rozhodcov a observerov SZFB
            </div>
            <h1 className="font-headline max-w-2xl text-4xl leading-[0.98] tracking-tight text-zinc-900 uppercase sm:text-5xl lg:text-6xl dark:text-zinc-50">
              Rozhodovanie florbalu,{" "}
              <span className="text-brand-indigo">konečne na jednom mieste.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-zinc-500">
              Delegácie, licencie, vzdelávanie a odmeny pre rozhodcov a observerov SZFB —
              v jednej aplikácii, nie v desiatich e-mailoch a excel tabuľkách.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <a
                href="/login"
                className="rounded-lg bg-brand-indigo px-7 py-3.5 text-sm font-bold tracking-wide text-white uppercase transition hover:bg-brand-indigo-dark"
              >
                Prihlásiť sa do portálu
              </a>
              <a
                href="#kontakt"
                className="rounded-lg border border-zinc-300 px-7 py-3.5 text-sm font-bold tracking-wide text-zinc-700 uppercase transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
              >
                Staň sa rozhodcom
              </a>
            </div>
          </div>

          <div className="w-full max-w-sm shrink-0 rounded-2xl border border-zinc-200 p-8 dark:border-zinc-800">
            <div className="mb-5 text-xs font-semibold tracking-wide text-zinc-400 uppercase">
              Tvoj profil rozhodcu
            </div>
            <div className="mb-6 flex items-center gap-3.5">
              <div className="h-[52px] w-[52px] shrink-0 rounded-full border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900" />
              <div>
                <div className="font-semibold text-zinc-800 dark:text-zinc-100">Meno Priezvisko</div>
                <div className="text-sm text-zinc-400">Región: Bratislava</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <div className="rounded-lg bg-zinc-50 p-3.5 text-center dark:bg-zinc-900">
                <div className="font-headline text-xl text-brand-indigo">B</div>
                <div className="mt-1 text-[11px] text-zinc-400">licencia</div>
              </div>
              <div className="rounded-lg bg-zinc-50 p-3.5 text-center dark:bg-zinc-900">
                <div className="font-headline text-xl text-zinc-800 dark:text-zinc-100">24</div>
                <div className="mt-1 text-[11px] text-zinc-400">zápasov sezóna</div>
              </div>
              <div className="rounded-lg bg-zinc-50 p-3.5 text-center dark:bg-zinc-900">
                <div className="font-headline text-xl text-brand-red">8.7</div>
                <div className="mt-1 text-[11px] text-zinc-400">hodnotenie</div>
              </div>
            </div>
            <div className="mt-5 text-[11px] text-zinc-400">Ukážkové dáta</div>
          </div>
        </div>

        {/* STATS STRIP */}
        <div className="grid grid-cols-2 border-t border-b border-zinc-200 lg:grid-cols-4 dark:border-zinc-800">
          {[
            { big: "N·C·B·A", label: "4 licenčné stupne" },
            { big: "4", label: "regióny: BA · Západ · Stred · Východ" },
            { big: "15+", label: "minimálny vek na školenie" },
            { big: "1", label: "miesto na všetko namiesto desiatich" },
          ].map((s, i) => (
            <div
              key={s.label}
              className={`px-6 py-7 sm:px-8 ${i % 2 === 0 ? "border-r border-zinc-200 dark:border-zinc-800" : ""} ${
                i < 2 ? "border-b border-zinc-200 lg:border-b-0 dark:border-zinc-800" : ""
              } ${i === 2 ? "lg:border-l lg:border-zinc-200 lg:dark:border-zinc-800" : ""}`}
            >
              <div className="font-headline text-2xl text-brand-indigo sm:text-3xl">{s.big}</div>
              <div className="mt-2 text-sm text-zinc-500">{s.label}</div>
            </div>
          ))}
        </div>

        {/* FEATURES */}
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-16 lg:py-24">
          <div className="mb-12 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <h2 className="font-headline max-w-lg text-3xl tracking-tight text-zinc-900 uppercase sm:text-4xl dark:text-zinc-50">
              Všetko, čo rozhodca potrebuje.
            </h2>
            <p className="max-w-sm text-sm text-zinc-500 lg:text-right">
              8 modulov postavených okolo reálneho života rozhodcu — od šatne po vyúčtovanie.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-px border border-zinc-200 bg-zinc-200 sm:grid-cols-2 lg:grid-cols-4 dark:border-zinc-800 dark:bg-zinc-800">
            {FEATURES.map((f) => (
              <div key={f.n} className="bg-white p-7 dark:bg-zinc-950">
                <div className="font-headline mb-5 text-sm text-brand-indigo">{f.n}</div>
                <div className="mb-2.5 font-semibold text-zinc-800 dark:text-zinc-100">{f.title}</div>
                <div className="text-sm leading-relaxed text-zinc-500">{f.text}</div>
              </div>
            ))}
          </div>
        </div>

        {/* LICENCE PATH */}
        <div className="mx-auto max-w-7xl px-6 pb-16 lg:px-16 lg:pb-24">
          <h2 className="font-headline text-3xl tracking-tight text-zinc-900 uppercase sm:text-4xl dark:text-zinc-50">
            Cesta rozhodcu.
          </h2>
          <p className="mt-3 mb-10 max-w-lg text-sm text-zinc-500">
            Od prvého píšťaľky na mládežníckom zápase až po extraligu — portál ťa vedie celou
            kariérou.
          </p>

          <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
            {LICENCE_PATH.map((l) => (
              <div key={l.level} className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
                <div className="font-headline mb-4 text-4xl text-brand-indigo">{l.level}</div>
                <div className="mb-1.5 font-semibold text-zinc-800 dark:text-zinc-100">{l.title}</div>
                <div className="text-xs leading-relaxed text-zinc-500">{l.text}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div id="kontakt" className="mx-6 mb-16 overflow-hidden rounded-2xl bg-brand-indigo p-10 lg:mx-16 lg:mb-24 lg:p-16">
          <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <div>
              <h2 className="font-headline text-3xl leading-tight text-white uppercase sm:text-4xl">
                Chceš pískať?
                <br />
                Napíš nám.
              </h2>
              <div className="mt-3 text-sm text-white/70">
                Kontakt na Komisiu rozhodcov a observerov SZFB — doplniť pred zverejnením.
              </div>
            </div>
            <a
              href="/login"
              className="shrink-0 rounded-lg bg-white px-7 py-3.5 text-sm font-bold tracking-wide text-brand-indigo uppercase transition hover:bg-white/90"
            >
              Zistiť viac o školeniach
            </a>
          </div>
        </div>

        {/* FOOTER NOTE */}
        <div className="mx-auto flex max-w-7xl flex-col gap-2 border-t border-zinc-200 px-6 py-8 text-xs text-zinc-400 sm:flex-row sm:items-center sm:justify-between lg:px-16 dark:border-zinc-800">
          <div>Rozhodcovský portál SZFB — pripravovaný úvod portálu</div>
          <div>Táto stránka je návrh a nie je zatiaľ verejne prepojená z portálu.</div>
        </div>
      </main>
    </>
  );
}
