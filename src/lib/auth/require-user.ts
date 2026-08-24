import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type RefereeProfile = {
  id: string;
  full_name: string;
  email: string;
  role: "admin" | "referee";
};

export async function requireUser(): Promise<RefereeProfile> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: referee } = await supabase
    .from("referees")
    .select("id, full_name, email, role")
    .eq("id", user.id)
    .single();

  if (!referee) {
    redirect("/login");
  }

  return referee;
}
