import { convexToken } from "@/lib/convexToken";
import { fetchQuery } from "convex/nextjs";
import { cache } from "react";
import { api } from "../../../../../convex/_generated/api";

/** Deduped per request: layout, metadata and page share one Convex call. */
export const getMeeting = cache(async (id: string) => {
  try {
    return await fetchQuery(
      api.meetings.getByAppointmentId,
      { appointmentId: id },
      { token: await convexToken() },
    );
  } catch {
    return null;
  }
});
