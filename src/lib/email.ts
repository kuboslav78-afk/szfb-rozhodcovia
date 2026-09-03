import { Resend } from "resend";

const FROM = "Portál rozhodcov SZFB <portal@rozhodcovia-szfb.sk>";
const DEFAULT_REPLY_TO = "kucera@szfb.sk";

function getClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Chýba RESEND_API_KEY — e-mail sa nedá odoslať.");
  }
  return new Resend(apiKey);
}

export type EmailInput = {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
};

/** Pošle jeden e-mail. Chybu loguje a hodí ďalej — volajúci si rozhodne, či ju má prehltnúť. */
export async function sendEmail({ to, subject, html, replyTo = DEFAULT_REPLY_TO }: EmailInput) {
  const resend = getClient();
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject,
    html,
    replyTo,
  });

  if (error) {
    throw new Error(`Odoslanie e-mailu zlyhalo: ${error.message}`);
  }
}

export type BatchEmailInput = {
  to: string;
  subject: string;
  html: string;
}[];

/** Pošle viac e-mailov naraz (max 100 na dávku — Resend limit), každý ako samostatná správa. */
export async function sendBatchEmails(emails: BatchEmailInput, replyTo = DEFAULT_REPLY_TO) {
  if (emails.length === 0) return { sent: 0, failed: 0 };

  const resend = getClient();
  const chunks: BatchEmailInput[] = [];
  for (let i = 0; i < emails.length; i += 100) {
    chunks.push(emails.slice(i, i + 100));
  }

  let sent = 0;
  let failed = 0;

  for (const chunk of chunks) {
    const { data, error } = await resend.batch.send(
      chunk.map((e) => ({ from: FROM, to: e.to, subject: e.subject, html: e.html, replyTo })),
    );

    if (error) {
      failed += chunk.length;
      continue;
    }

    sent += data?.data?.length ?? chunk.length;
  }

  return { sent, failed };
}

/** Slovenčina rozlišuje oslovenie podľa rodu; priezvisko na "-ová" je bežný signál ženského rodu. */
function formalGreeting(fullName: string) {
  const lastName = fullName.trim().split(/\s+/).pop() ?? "";
  const isFemale = /ová$/i.test(lastName);
  return isFemale ? "Vážená rozhodkyňa SZFB," : "Vážený rozhodca SZFB,";
}

function signatureBlock() {
  return `
    <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #e4e4e7; font-size: 14px; line-height: 1.6; color: #18181b;">
      <p style="margin: 0 0 16px 0;">S pozdravom</p>
      <p style="margin: 0; font-weight: 700;">Jakub Kučera</p>
      <p style="margin: 0; font-style: italic; color: #52525b;">predseda Komisie rozhodcov a observerov</p>
      <p style="margin: 12px 0 0 0; color: #52525b;">Slovenský zväz florbalu</p>
      <p style="margin: 0; color: #52525b;">Olympijské námestie 14290/1, 832 80 Bratislava, Slovenská republika</p>
      <p style="margin: 4px 0 0 0;">
        <a href="tel:+421902095619" style="color: #2e3192; text-decoration: none;">+421 902 095 619</a>
        <span style="color: #a1a1aa;"> | </span>
        <a href="https://www.szfb.sk" style="color: #2e3192; text-decoration: none;">www.szfb.sk</a>
      </p>
    </div>
  `;
}

function baseWrapper(bodyHtml: string) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #18181b;">
      <div style="background: #2e3192; padding: 20px 24px;">
        <span style="color: #ffffff; font-weight: 700; font-size: 16px; letter-spacing: 0.02em;">PORTÁL ROZHODCOV SZFB</span>
      </div>
      <div style="height: 4px; background: #ed1c24;"></div>
      <div style="padding: 24px;">
        ${bodyHtml}
        ${signatureBlock()}
      </div>
      <div style="padding: 16px 24px; color: #a1a1aa; font-size: 12px; border-top: 1px solid #e4e4e7;">
        Slovenský zväz florbalu · Portál rozhodcov SZFB
      </div>
    </div>
  `;
}

export function nominationSentEmailHtml(params: {
  refereeName: string;
  teamHome: string;
  teamAway: string;
  matchDate: string;
  matchTime: string | null;
  venue: string | null;
  league: string;
  reason: "new" | "time_changed";
}) {
  const { refereeName, teamHome, teamAway, matchDate, matchTime, venue, league, reason } = params;

  const [year, month, day] = matchDate.split("-").map(Number);
  const dateLabel = new Date(year, month - 1, day).toLocaleDateString("sk-SK", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const intro =
    reason === "time_changed"
      ? "zmenil sa čas zápasu, na ktorý si už bol/a nominovaný/á — potvrď prosím nomináciu znova:"
      : "prišla ti nová nominácia na zápas — potvrď ju prosím čo najskôr:";

  return baseWrapper(`
    <p style="font-size: 15px; line-height: 1.5;">${formalGreeting(refereeName)}</p>
    <p style="font-size: 15px; line-height: 1.5;">${intro}</p>
    <div style="background: #f4f4f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0 0 4px 0; font-weight: 700; font-size: 15px;">${teamHome} vs ${teamAway}</p>
      <p style="margin: 0 0 4px 0; font-size: 14px; color: #52525b;">${dateLabel}${matchTime ? `, ${matchTime.slice(0, 5)}` : ""}</p>
      <p style="margin: 0; font-size: 14px; color: #52525b;">${venue ?? "miesto zatiaľ neurčené"} · ${league}</p>
    </div>
    <a href="https://rozhodcovia-szfb.sk/nominations" style="display: inline-block; background: #2e3192; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 700; font-size: 14px;">Potvrdiť nomináciu</a>
  `);
}

export function bulkAnnouncementEmailHtml(params: { refereeName: string; bodyText: string }) {
  const paragraphs = params.bodyText
    .split("\n")
    .map((line) => `<p style="font-size: 15px; line-height: 1.6; margin: 0 0 12px 0;">${line || "&nbsp;"}</p>`)
    .join("");

  return baseWrapper(`
    <p style="font-size: 15px; line-height: 1.5;">${formalGreeting(params.refereeName)}</p>
    ${paragraphs}
  `);
}
