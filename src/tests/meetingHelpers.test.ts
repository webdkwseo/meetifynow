import { ConvexError } from "convex/values";
import { describe, expect, it } from "vitest";
import { errorCode, errorText } from "../app/lib/utils";
import { buildIcs, googleCalendarUrl } from "../utils/meeting/calendar";
import { hasAnswered, pendingMembers } from "../utils/meeting/participants";

describe("participants", () => {
  const answers = [
    { userId: "user_1", username: "Kasia" },
    { username: "Jan Kowalski" },
  ];

  it("matches signed-in answers by Clerk id even when the typed name differs", () => {
    expect(
      hasAnswered(
        { userId: "user_1", displayName: "Katarzyna Nowak" },
        answers,
      ),
    ).toBe(true);
  });

  it("falls back to case-insensitive name or e-mail", () => {
    expect(hasAnswered({ displayName: " jan kowalski " }, answers)).toBe(true);
    expect(
      hasAnswered({ invitedEmail: "kasia@example.com" }, [
        { username: "Kasia@example.com" },
      ]),
    ).toBe(true);
  });

  it("lists members who have not answered", () => {
    const members = [
      { userId: "user_1" },
      { userId: "user_2", displayName: "Ola" },
      { userId: "", invitedEmail: "jan@example.com" },
    ];
    expect(pendingMembers(members, answers)).toEqual([members[1], members[2]]);
  });
});

describe("calendar", () => {
  const event = {
    uid: "abc1234",
    title: "Kickoff, part 1; v2",
    start: Date.UTC(2026, 10, 3, 9, 30),
    durationMinutes: 90,
    location: "Room 1",
    url: "https://meetifynow.com/pl/meet/abc1234",
  };

  it("builds an .ics event with escaped text and the right end time", () => {
    const ics = buildIcs(event, Date.UTC(2026, 9, 31));
    expect(ics).toContain("DTSTART:20261103T093000Z");
    expect(ics).toContain("DTEND:20261103T110000Z");
    expect(ics).toContain("SUMMARY:Kickoff\\, part 1\\; v2");
    expect(ics).toContain("UID:abc1234@meetifynow.com");
    expect(ics.split("\r\n")[0]).toBe("BEGIN:VCALENDAR");
  });

  it("builds a Google Calendar link", () => {
    const url = new URL(googleCalendarUrl(event));
    expect(url.searchParams.get("dates")).toBe(
      "20261103T093000Z/20261103T110000Z",
    );
    expect(url.searchParams.get("text")).toBe(event.title);
    expect(url.searchParams.get("location")).toBe("Room 1");
  });
});

describe("errorText", () => {
  const errors = { USERNAME_TAKEN: "Taken" };

  it("maps ConvexError codes to dictionary messages", () => {
    const err = new ConvexError({ code: "USERNAME_TAKEN" });
    expect(errorCode(err)).toBe("USERNAME_TAKEN");
    expect(errorText(err, errors, "fallback")).toBe("Taken");
  });

  it("uses the fallback for unknown codes and plain errors", () => {
    expect(
      errorText(new ConvexError({ code: "NOPE" }), errors, "fallback"),
    ).toBe("fallback");
    // Production redacts plain Error messages, so they must never be shown.
    expect(errorText(new Error("Server Error"), errors, "fallback")).toBe(
      "fallback",
    );
  });
});
