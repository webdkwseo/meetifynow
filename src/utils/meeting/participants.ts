/** Shared by Convex (fill reminders) and the UI (who still has to answer). */

type MemberLike = {
  userId?: string;
  displayName?: string;
  invitedEmail?: string;
};

type AnswerLike = { userId?: string; username: string };

const norm = (s: string) => s.toLowerCase().trim();

/**
 * Logged-in answers carry the Clerk `userId`, which is the reliable match.
 * Name/e-mail matching is the fallback for anonymous answers.
 */
export function hasAnswered(
  member: MemberLike,
  answers: AnswerLike[],
): boolean {
  const names = [member.displayName, member.invitedEmail]
    .filter((n): n is string => !!n)
    .map(norm);
  return answers.some(
    (a) =>
      (!!member.userId && a.userId === member.userId) ||
      names.includes(norm(a.username)),
  );
}

export function pendingMembers<M extends MemberLike>(
  members: M[],
  answers: AnswerLike[],
): M[] {
  return members.filter((m) => !hasAnswered(m, answers));
}
