import { cookies } from "next/headers";

export const VIEW_MODE_COOKIE = "szfb_view_mode";

/**
 * Iba UI náhľad — administrátor (skutočná rola v DB) si vie prepnúť dashboard
 * do "pohľadu rozhodcu", aby videl appku tak ako bežný rozhodca. Skutočné
 * oprávnenia (RLS, server actions) sa týmto nemenia, kontrolujú vždy
 * skutočnú rolu z referees.role.
 */
export async function getEffectiveIsAdmin(realRole: string): Promise<boolean> {
  if (realRole !== "admin") return false;
  const store = await cookies();
  return store.get(VIEW_MODE_COOKIE)?.value !== "referee";
}
