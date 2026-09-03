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

/**
 * Je zapnutý "náhľad rozhodcu"? Na rozdiel od getEffectiveIsAdmin sa neviaže na
 * rolu — prepínač má aj regionálny admin a člen KRO s nahliadacím prístupom,
 * ktorí sú zároveň aktívni rozhodcovia a potrebujú si prepnúť na svoju dostupnosť.
 */
export async function isRefereeViewActive(): Promise<boolean> {
  const store = await cookies();
  return store.get(VIEW_MODE_COOKIE)?.value === "referee";
}
