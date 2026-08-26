// Založí účty rozhodcov priamo s predvoleným heslom (priezvisko.meno, bez diakritiky,
// malými písmenami) — bez posielania e-mailu. Rozhodca si heslo zmení v profile po prihlásení.
//
// Použitie:
//   node --env-file=.env.local scripts/create-referee-accounts.mjs --file=referees.json --email=jeden@email.sk
//   node --env-file=.env.local scripts/create-referee-accounts.mjs --file=referees.json --all
//
// Vyžaduje v .env.local:
//   NEXT_PUBLIC_SUPABASE_URL=...
//   SUPABASE_SECRET_KEY=...   (service_role kľúč, NIKDY s NEXT_PUBLIC_ prefixom)

import { readFile, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

function parseArgs(argv) {
  const args = {};
  for (const raw of argv) {
    const [key, value] = raw.replace(/^--/, "").split("=");
    args[key] = value ?? true;
  }
  return args;
}

function slugify(part) {
  return part
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // odstráni diakritiku
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

function defaultPassword(fullName) {
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts[0] ?? "";
  const lastName = parts.slice(1).join("") || firstName;
  return `${slugify(lastName)}.${slugify(firstName)}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error(
      "Chýba NEXT_PUBLIC_SUPABASE_URL alebo SUPABASE_SECRET_KEY v prostredí.",
    );
    process.exit(1);
  }

  if (!args.file) {
    console.error("Chýba --file=<cesta k referees.json>");
    process.exit(1);
  }

  if (!args.all && !args.email) {
    console.error(
      "Zadaj buď --email=<jeden@email.sk> (test) alebo --all (celý zoznam).",
    );
    process.exit(1);
  }

  const raw = await readFile(args.file, "utf-8");
  const referees = JSON.parse(raw);

  const targets = args.all
    ? referees
    : referees.filter(
        (r) => r.email.toLowerCase() === String(args.email).toLowerCase(),
      );

  if (targets.length === 0) {
    console.error("Nenašiel som žiadneho rozhodcu podľa zadaného emailu.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`Zakladám ${targets.length} účtov...`);

  const results = { created: [], skipped: [], failed: [] };
  const credentials = [];

  for (const referee of targets) {
    const { data: existing } = await supabase
      .from("referees")
      .select("id")
      .eq("email", referee.email)
      .maybeSingle();

    if (existing) {
      console.log(`⏭  preskakujem (už existuje): ${referee.email}`);
      results.skipped.push(referee.email);
      continue;
    }

    const password = defaultPassword(referee.full_name);

    const { data, error } = await supabase.auth.admin.createUser({
      email: referee.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: referee.full_name },
    });

    if (error) {
      console.error(`✗ ${referee.email}: ${error.message}`);
      results.failed.push({ email: referee.email, error: error.message });
      continue;
    }

    if (data.user && (referee.phone || referee.license)) {
      const { error: updateError } = await supabase
        .from("referees")
        .update({
          ...(referee.phone ? { phone: referee.phone } : {}),
          ...(referee.license ? { license_level: referee.license } : {}),
        })
        .eq("id", data.user.id);

      if (updateError) {
        console.error(
          `  (upozornenie: profil sa nepodarilo doplniť pre ${referee.email}: ${updateError.message})`,
        );
      }
    }

    // Kategória sa priradí len ak je explicitne v dátach — inak rozhodca
    // dostane pri prvom prihlásení výzvu vybrať si domáci región.
    if (data.user && referee.category) {
      const { error: categoryError } = await supabase
        .from("referee_categories")
        .upsert(
          { referee_id: data.user.id, category: referee.category },
          { onConflict: "referee_id,category" },
        );

      if (categoryError) {
        console.error(
          `  (upozornenie: kategória sa nepodarila nastaviť pre ${referee.email}: ${categoryError.message})`,
        );
      }
    }

    console.log(`✓ vytvorený: ${referee.email} (heslo: ${password})`);
    results.created.push(referee.email);
    credentials.push({ full_name: referee.full_name, email: referee.email, password });
  }

  console.log("\n--- Zhrnutie ---");
  console.log(`Vytvorení: ${results.created.length}`);
  console.log(`Preskočení (už existovali): ${results.skipped.length}`);
  console.log(`Zlyhali: ${results.failed.length}`);
  if (results.failed.length > 0) {
    console.log(JSON.stringify(results.failed, null, 2));
  }

  if (credentials.length > 0 && args.out) {
    await writeFile(args.out, JSON.stringify(credentials, null, 2), "utf-8");
    console.log(`\nZoznam prihlasovacích údajov uložený do: ${args.out}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
