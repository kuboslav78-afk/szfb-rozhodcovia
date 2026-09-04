"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireSuperAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Pre túto akciu sa musíš prihlásiť.");

  const { data: referee } = await supabase
    .from("referees")
    .select("role")
    .eq("id", user.id)
    .single();

  if (referee?.role !== "admin") {
    throw new Error("Banku otázok môže spravovať len administrátor.");
  }

  return supabase;
}

export type QuestionInput = {
  question: string;
  topic?: string | null;
  ruleReference?: string | null;
  videoUrl?: string | null;
  explanation?: string | null;
  answers: { answer: string; correct?: boolean }[];
};

function validate(input: QuestionInput, index?: number) {
  const where = index == null ? "" : ` (otázka č. ${index + 1})`;

  if (!input.question?.trim()) throw new Error(`Otázka nesmie byť prázdna${where}.`);
  if (!Array.isArray(input.answers) || input.answers.length < 2) {
    throw new Error(`Otázka musí mať aspoň dve možnosti${where}.`);
  }
  if (input.answers.filter((a) => a.correct).length !== 1) {
    throw new Error(`Práve jedna možnosť musí byť označená ako správna${where}.`);
  }
  if (input.answers.some((a) => !a.answer?.trim())) {
    throw new Error(`Možnosť odpovede nesmie byť prázdna${where}.`);
  }
}

function questionRow(input: QuestionInput) {
  return {
    question: input.question.trim(),
    topic: input.topic?.trim() || null,
    rule_reference: input.ruleReference?.trim() || null,
    video_url: input.videoUrl?.trim() || null,
    explanation: input.explanation?.trim() || null,
  };
}

export async function saveQuestion(input: QuestionInput, questionId?: string) {
  const supabase = await requireSuperAdmin();
  validate(input);

  let id = questionId;

  if (id) {
    const { error } = await supabase
      .from("test_questions")
      .update({ ...questionRow(input), updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
    await supabase.from("test_answers").delete().eq("question_id", id);
  } else {
    const { data, error } = await supabase
      .from("test_questions")
      .insert(questionRow(input))
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    id = data.id as string;
  }

  const { error: answersError } = await supabase.from("test_answers").insert(
    input.answers.map((a, position) => ({
      question_id: id,
      answer: a.answer.trim(),
      is_correct: Boolean(a.correct),
      position,
    })),
  );
  if (answersError) throw new Error(answersError.message);

  revalidatePath("/testovanie");
}

export async function setQuestionActive(questionId: string, active: boolean) {
  const supabase = await requireSuperAdmin();
  const { error } = await supabase
    .from("test_questions")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", questionId);
  if (error) throw new Error(error.message);
  revalidatePath("/testovanie");
}

export async function deleteQuestion(questionId: string) {
  const supabase = await requireSuperAdmin();
  const { error } = await supabase.from("test_questions").delete().eq("id", questionId);
  if (error) throw new Error(error.message);
  revalidatePath("/testovanie");
}

type RawQuestion = Record<string, unknown>;

/**
 * Prevedie otázku z vonkajšieho zdroja na náš tvar. Zvládne aj formát, v akom
 * otázky generuje Claude (`options` + `correctAnswerIndex`), aj náš vlastný
 * (`answers` s príznakom správnosti).
 */
function normalise(raw: RawQuestion, index: number): QuestionInput {
  const text = String(raw.question ?? raw.otazka ?? "").trim();
  const options = raw.options ?? raw.moznosti;
  const answers: { answer: string; correct?: boolean }[] = [];

  if (Array.isArray(options)) {
    const correctIndex =
      typeof raw.correctAnswerIndex === "number"
        ? raw.correctAnswerIndex
        : typeof raw.correctAnswerLetter === "string"
          ? raw.correctAnswerLetter.trim().toUpperCase().charCodeAt(0) - 65
          : -1;

    if (correctIndex < 0 || correctIndex >= options.length) {
      throw new Error(
        `Nedá sa určiť správna odpoveď (otázka č. ${index + 1}) — chýba correctAnswerIndex alebo correctAnswerLetter.`,
      );
    }

    options.forEach((option, i) =>
      answers.push({ answer: String(option), correct: i === correctIndex }),
    );
  } else if (Array.isArray(raw.answers)) {
    for (const a of raw.answers as RawQuestion[]) {
      answers.push({ answer: String(a.answer ?? ""), correct: Boolean(a.correct) });
    }
  }

  return {
    question: text,
    topic: (raw.topic ?? raw.category ?? raw.kategoria) as string | null,
    ruleReference: (raw.ruleReference ?? raw.pravidlo) as string | null,
    videoUrl: (raw.videoUrl ?? raw.video_url) as string | null,
    explanation: (raw.explanation ?? raw.vysvetlenie) as string | null,
    answers,
  };
}

/** Hromadný import z JSON. */
export async function importQuestions(json: string) {
  const supabase = await requireSuperAdmin();

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Vstup nie je platný JSON.");
  }

  // Prijmeme aj celý súbor s hlavičkou ({ questions: [...] }), aj holé pole.
  const list =
    Array.isArray(parsed)
      ? parsed
      : ((parsed as RawQuestion)?.questions as unknown);

  if (!Array.isArray(list)) {
    throw new Error('Očakávam pole otázok, prípadne objekt s kľúčom "questions".');
  }

  const questions = (list as RawQuestion[]).map(normalise);
  questions.forEach((q, i) => validate(q, i));

  const { data: inserted, error } = await supabase
    .from("test_questions")
    .insert(questions.map(questionRow))
    .select("id");

  if (error) throw new Error(error.message);

  const answers = (inserted ?? []).flatMap((row, i) =>
    questions[i].answers.map((a, position) => ({
      question_id: row.id as string,
      answer: a.answer.trim(),
      is_correct: Boolean(a.correct),
      position,
    })),
  );

  const { error: answersError } = await supabase.from("test_answers").insert(answers);
  if (answersError) throw new Error(answersError.message);

  revalidatePath("/testovanie");
  return { imported: questions.length };
}

/** Sprístupnenie modulu rozhodcom — kým je vypnutý, vidia ho len administrátori. */
export async function setTestingEnabled(enabled: boolean) {
  const supabase = await requireSuperAdmin();

  const { error } = await supabase.from("app_settings").upsert(
    { key: "testing_enabled", value: String(enabled), updated_at: new Date().toISOString() },
    { onConflict: "key" },
  );

  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export type TestQuestion = {
  id: string;
  position: number;
  question: string;
  videoUrl: string | null;
  topic: string | null;
  ruleReference: string | null;
  explanation: string | null;
  chosenAnswerId: string | null;
  isCorrect: boolean | null;
  answers: { id: string; answer: string; isCorrect: boolean | null }[];
};

export async function startWeeklyTest(): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("ensure_weekly_test");
  if (error) throw new Error(error.message);
  return data as string;
}

export async function loadTestQuestions(assignmentId: string): Promise<TestQuestion[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_test_questions", {
    p_assignment_id: assignmentId,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as TestQuestion[];
}

export async function submitTest(
  assignmentId: string,
  answers: { questionId: string; answerId: string | null }[],
): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_test", {
    p_assignment_id: assignmentId,
    p_answers: answers,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/testovanie");
  return data as number;
}
