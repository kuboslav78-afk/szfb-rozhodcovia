// Pozve rozhodcov do portálu cez Supabase (email s odkazom na nastavenie hesla).
//
// Použitie:
//   node --env-file=.env.local scripts/invite-referees.mjs --file=referees.json --email=jeden@email.sk
//   node --env-file=.env.local scripts/invite-referees.mjs --file=referees.json --all --delay=1500
//
// Vyžaduje v .env.local:
//   NEXT_PUBLIC_SUPABASE_URL=...
//   SUPABASE_SECRET_KEY=...   (service_role kľúč, NIKDY s NEXT_PUBLIC_ prefixom)

import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

function parseArgs(argv) {
  const args = { delay: 1500 };
  for (const raw of argv) {
    const [key, value] = raw.replace(/^--/, "").split("=");
    args[key] = value ?? true;
  }
  return args;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error(
      "Chýba NEXT_PUBLIC_SUPABASE_URL alebo SUPABASE_SECRET_KEY v prostredí. Spusti cez: node --env-file=.env.local scripts/invite-referees.mjs ...",
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

  console.log(`Spracúvam ${targets.length} rozhodcov (delay ${args.delay}ms)...`);

  const results = { invited: [], skipped: [], failed: [] };

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

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const { data, error } = await supabase.auth.admin.inviteUserByEmail(
      referee.email,
      {
        data: { full_name: referee.full_name },
        redirectTo: `${siteUrl}/nastavit-heslo`,
      },
    );

    if (error) {
      console.error(`✗ ${referee.email}: ${error.message}`);
      results.failed.push({ email: referee.email, error: error.message });
      continue;
    }

    if (referee.phone && data.user) {
      const { error: updateError } = await supabase
        .from("referees")
        .update({ phone: referee.phone })
        .eq("id", data.user.id);

      if (updateError) {
        console.error(
          `  (upozornenie: telefón sa nepodarilo uložiť pre ${referee.email}: ${updateError.message})`,
        );
      }
    }

    if (data.user) {
      const { error: categoryError } = await supabase
        .from("referee_categories")
        .upsert(
          { referee_id: data.user.id, category: "celostatny" },
          { onConflict: "referee_id,category" },
        );

      if (categoryError) {
        console.error(
          `  (upozornenie: kategória sa nepodarila nastaviť pre ${referee.email}: ${categoryError.message})`,
        );
      }
    }

    console.log(`✓ pozvaný: ${referee.email}`);
    results.invited.push(referee.email);

    if (targets.length > 1) {
      await sleep(Number(args.delay));
    }
  }

  console.log("\n--- Zhrnutie ---");
  console.log(`Pozvaní: ${results.invited.length}`);
  console.log(`Preskočení (už existovali): ${results.skipped.length}`);
  console.log(`Zlyhali: ${results.failed.length}`);
  if (results.failed.length > 0) {
    console.log(JSON.stringify(results.failed, null, 2));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
