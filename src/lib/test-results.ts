import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAllRows } from "@/lib/paginate";
import { weekMondayIso } from "@/lib/dates";

export type RefereeResult = {
  refereeId: string;
  refereeName: string;
  /** Počet odoslaných testov. */
  taken: number;
  /** Súčet bodov a otázok naprieč všetkými testami — z toho je dlhodobá úspešnosť. */
  correct: number;
  total: number;
  successRate: number;
  lastScore: number | null;
  lastWeek: string | null;
  /** Má tento týždeň test odoslaný? */
  doneThisWeek: boolean;
};

export type TestResults = {
  referees: RefereeResult[];
  /** Aktívni rozhodcovia, ktorí ešte neodoslali ani jeden test. */
  neverTook: { refereeId: string; refereeName: string }[];
  thisWeekDone: number;
  thisWeekTotal: number;
  overallRate: number | null;
  /** Otázky, v ktorých sa najviac chybuje — podklad na doškolenie. */
  hardest: { question: string; topic: string | null; attempts: number; rate: number }[];
};

export async function getTestResults(supabase: SupabaseClient): Promise<TestResults> {
  const [allReferees, kroRows, assignments, responses, questions] = await Promise.all([
    fetchAllRows<{ id: string; full_name: string }>((f, t) =>
      supabase
        .from("referees")
        .select("id, full_name")
        .eq("active", true)
        .eq("role", "referee")
        .order("full_name")
        .range(f, t),
    ),
    // Členovia komisie testy nevypĺňajú, takže do štatistík nepatria.
    fetchAllRows<{ referee_id: string }>((f, t) =>
      supabase
        .from("category_admins")
        .select("referee_id")
        .order("referee_id")
        .range(f, t),
    ),
    fetchAllRows<{
      id: string;
      referee_id: string;
      week_start: string;
      submitted_at: string | null;
      score: number | null;
      question_ids: string[];
    }>((f, t) =>
      supabase
        .from("test_assignments")
        .select("id, referee_id, week_start, submitted_at, score, question_ids")
        .order("week_start")
        .range(f, t),
    ),
    fetchAllRows<{ assignment_id: string; question_id: string; is_correct: boolean }>(
      (f, t) =>
        supabase
          .from("test_responses")
          .select("assignment_id, question_id, is_correct")
          .order("assignment_id")
          .range(f, t),
    ),
    fetchAllRows<{ id: string; question: string; topic: string | null }>((f, t) =>
      supabase.from("test_questions").select("id, question, topic").order("id").range(f, t),
    ),
  ]);

  const kro = new Set(kroRows.map((r) => r.referee_id));
  const referees = allReferees.filter((r) => !kro.has(r.id));

  const thisWeek = weekMondayIso();
  const submitted = assignments.filter((a) => a.submitted_at);
  const byId = new Map(referees.map((r) => [r.id, r.full_name]));

  const perReferee = new Map<string, RefereeResult>();

  for (const assignment of submitted) {
    const name = byId.get(assignment.referee_id);
    if (!name) continue;

    const row =
      perReferee.get(assignment.referee_id) ??
      {
        refereeId: assignment.referee_id,
        refereeName: name,
        taken: 0,
        correct: 0,
        total: 0,
        successRate: 0,
        lastScore: null,
        lastWeek: null,
        doneThisWeek: false,
      };

    row.taken += 1;
    row.correct += assignment.score ?? 0;
    row.total += assignment.question_ids.length;

    // Zoradené podľa týždňa, takže posledný prepis je ten najnovší.
    row.lastScore = assignment.score;
    row.lastWeek = assignment.week_start;
    if (assignment.week_start === thisWeek) row.doneThisWeek = true;

    perReferee.set(assignment.referee_id, row);
  }

  const results = Array.from(perReferee.values()).map((r) => ({
    ...r,
    successRate: r.total > 0 ? Math.round((r.correct / r.total) * 100) : 0,
  }));

  const totalCorrect = results.reduce((s, r) => s + r.correct, 0);
  const totalAnswers = results.reduce((s, r) => s + r.total, 0);

  // Ktoré otázky robia najväčší problém — počítame len tie, ktoré už niekto dostal.
  const perQuestion = new Map<string, { attempts: number; correct: number }>();
  for (const response of responses) {
    const bucket = perQuestion.get(response.question_id) ?? { attempts: 0, correct: 0 };
    bucket.attempts += 1;
    if (response.is_correct) bucket.correct += 1;
    perQuestion.set(response.question_id, bucket);
  }

  const questionById = new Map(questions.map((q) => [q.id, q]));
  const hardest = Array.from(perQuestion.entries())
    .filter(([, v]) => v.attempts >= 3)
    .map(([id, v]) => ({
      question: questionById.get(id)?.question ?? "?",
      topic: questionById.get(id)?.topic ?? null,
      attempts: v.attempts,
      rate: Math.round((v.correct / v.attempts) * 100),
    }))
    .sort((a, b) => a.rate - b.rate)
    .slice(0, 8);

  return {
    referees: results.sort((a, b) => b.successRate - a.successRate),
    neverTook: referees
      .filter((r) => !perReferee.has(r.id))
      .map((r) => ({ refereeId: r.id, refereeName: r.full_name })),
    thisWeekDone: submitted.filter((a) => a.week_start === thisWeek).length,
    thisWeekTotal: referees.length,
    overallRate: totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : null,
    hardest,
  };
}
