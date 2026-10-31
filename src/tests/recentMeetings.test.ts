import { describe, expect, it } from "vitest";
import {
  forgetMeeting,
  readRecentMeetings,
  rememberMeeting,
} from "../app/lib/recentMeetings";

describe("recentMeetings", () => {
  it("keeps the newest first and the creator role when the creator also answers", () => {
    rememberMeeting({ id: "a", name: "A", role: "created" });
    rememberMeeting({ id: "b", name: "B", role: "answered" });
    rememberMeeting({ id: "a", name: "A", role: "answered" });
    const list = readRecentMeetings();
    expect(list.map((m) => m.id)).toEqual(["a", "b"]);
    expect(list[0].role).toBe("created");
  });

  it("caps the list and forgets entries", () => {
    for (let i = 0; i < 25; i++)
      rememberMeeting({ id: `m${i}`, name: `M${i}`, role: "answered" });
    expect(readRecentMeetings()).toHaveLength(20);
    forgetMeeting("m24");
    expect(readRecentMeetings().some((m) => m.id === "m24")).toBe(false);
  });

  it("survives corrupted storage", () => {
    localStorage.setItem("meetifynow_recent", "{not json");
    expect(readRecentMeetings()).toEqual([]);
  });
});
