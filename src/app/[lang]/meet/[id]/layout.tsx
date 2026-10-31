import { notFound } from "next/navigation";
import { getMeeting } from "./getMeeting";

export default async function MeetingLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Runs outside loading.tsx's Suspense, so a missing (or private) meeting
  // gets a real 404 status instead of a streamed 200.
  if (!(await getMeeting(id))) notFound();
  return children;
}
