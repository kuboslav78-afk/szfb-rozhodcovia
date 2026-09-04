import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { PageTitle } from "@/components/PageTitle";
import { ComingSoonSection } from "@/components/ComingSoonSection";
import { QuestionBank, type BankQuestion } from "@/components/QuestionBank";
import { TestResultsPanel } from "@/components/TestResultsPanel";
import { getTestResults } from "@/lib/test-results";
import { WeeklyTest } from "@/components/WeeklyTest";
import { getPendingNominationCount } from "@/lib/nominations";
import { getEffectiveIsAdmin } from "@/lib/view-mode";
import { isTestingEnabled } from "@/lib/settings";
import { fetchAllRows } from "@/lib/paginate";
import { getCategoryAccess } from "@/lib/category-access";

function weekMondayLabel() {
  const now = new Date();
  const sinceMonday = (now.getDay() + 6) % 7;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - sinceMonday);
  return monday.toLocaleDateString("sk-SK", { day: "numeric", month: "long" });
}

function weekMondayIso() {
  const now = new Date();
  const sinceMonday = (now.getDay() + 6) % 7;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - sinceMonday);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
}

export default async function TestovaniePage() {
  const referee = await requireUser();
  const supabase = await createClient();
  const realIsAdmin = referee.role === "admin";
  const isSuperAdmin = await getEffectiveIsAdmin(referee.role);
  const pendingNominations = await getPendingNominationCount(supabase, referee.id);
  const enabled = await isTestingEnabled(supabase);

  // Banku a výsledky vidí celá KRO — super admin, viewer aj členovia komisie
  // s kategóriovým prístupom. Upravovať ich smie len super admin.
  const categoryAccess = await getCategoryAccess(supabase, referee.id, realIsAdmin);
  const isKro =
    realIsAdmin || referee.role === "viewer" || categoryAccess.visible.length > 0;

  const sidebar = (
    <Sidebar
      current="testovanie"
      refereeName={referee.full_name}
      roleLabel={
        realIsAdmin
          ? isSuperAdmin
            ? "Administrátor"
            : "Administrátor · náhľad rozhodcu"
          : referee.role === "viewer"
            ? "Viewer"
            : null
      }
      isAdmin={isSuperAdmin}
      canSeeKro={isSuperAdmin || referee.role === "viewer"}
      pendingNominations={pendingNominations}
      canToggleView={realIsAdmin}
      viewMode={isSuperAdmin ? "admin" : "referee"}
      testingEnabled={enabled}
    />
  );

  // Kým KRO banku otázok nepustí von, modul vidí len komisia.
  if (!enabled && !isKro) {
    return (
      <div className="lg:flex">
        {sidebar}
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-10">
            <ComingSoonSection title="Testovanie" />
          </main>
        </div>
      </div>
    );
  }

  if (isKro) {
    const [questionRows, answerRows] = await Promise.all([
      fetchAllRows<{
        id: string;
        question: string;
        topic: string | null;
        rule_reference: string | null;
        video_url: string | null;
        explanation: string | null;
        active: boolean;
      }>((f, t) =>
        supabase
          .from("test_questions")
          .select("id, question, topic, rule_reference, video_url, explanation, active")
          .order("topic")
          .order("created_at")
          .range(f, t),
      ),
      fetchAllRows<{ question_id: string; answer: string; is_correct: boolean; position: number }>(
        (f, t) =>
          supabase
            .from("test_answers")
            .select("question_id, answer, is_correct, position")
            .order("question_id")
            .order("position")
            .range(f, t),
      ),
    ]);

    const answersByQuestion = new Map<string, { answer: string; isCorrect: boolean }[]>();
    for (const a of answerRows) {
      if (!answersByQuestion.has(a.question_id)) answersByQuestion.set(a.question_id, []);
      answersByQuestion.get(a.question_id)!.push({
        answer: a.answer,
        isCorrect: a.is_correct,
      });
    }

    const questions: BankQuestion[] = questionRows.map((q) => ({
      ...q,
      answers: answersByQuestion.get(q.id) ?? [],
    }));

    const results = await getTestResults(supabase);

    return (
      <div className="lg:flex">
        {sidebar}
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
            <PageTitle className="mb-1">Testovanie</PageTitle>
            <p className="mb-8 text-sm text-zinc-400">
              Banka otázok, z ktorej každý rozhodca dostane na týždeň náhodných 10.
              Prednosť majú otázky, ktoré ešte nedostal.
              {!isSuperAdmin && " Banku upravuje predseda komisie."}
            </p>
            <TestResultsPanel results={results} />
            <QuestionBank
              questions={questions}
              enabled={enabled}
              readOnly={!isSuperAdmin}
            />
          </main>
        </div>
      </div>
    );
  }

  const { data: assignment } = await supabase
    .from("test_assignments")
    .select("id, submitted_at, score")
    .eq("referee_id", referee.id)
    .eq("week_start", weekMondayIso())
    .maybeSingle();

  return (
    <div className="lg:flex">
      {sidebar}
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
          <PageTitle className="mb-1">Testovanie</PageTitle>
          <p className="mb-8 text-sm text-zinc-400">
            Každý týždeň desať otázok z pravidiel florbalu.
          </p>
          <WeeklyTest
            assignmentId={assignment?.id ?? null}
            submitted={Boolean(assignment?.submitted_at)}
            score={assignment?.score ?? null}
            weekLabel={weekMondayLabel()}
          />
        </main>
      </div>
    </div>
  );
}
