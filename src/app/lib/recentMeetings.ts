/** Meetings this browser created or answered — the only "account" while sign-in is off. */

const KEY = "meetifynow_recent";
const LIMIT = 20;

export type RecentMeeting = {
  id: string;
  name: string;
  role: "created" | "answered";
  at: number;
};

export function readRecentMeetings(): RecentMeeting[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function write(list: RecentMeeting[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, LIMIT)));
  } catch {}
}

export function rememberMeeting(m: Omit<RecentMeeting, "at">) {
  const list = readRecentMeetings();
  const existing = list.find((x) => x.id === m.id);
  // Being the creator matters more than having answered.
  const role = existing?.role === "created" ? "created" : m.role;
  write([{ ...m, role, at: Date.now() }, ...list.filter((x) => x.id !== m.id)]);
}

export function forgetMeeting(id: string) {
  write(readRecentMeetings().filter((x) => x.id !== id));
}
