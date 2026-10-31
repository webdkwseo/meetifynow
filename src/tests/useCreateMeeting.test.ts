import { act, renderHook } from "@testing-library/react";
import { vi } from "vitest";
import { useCreateMeeting } from "../app/hooks/useCreateMeeting";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ user: { id: "test-user-id" }, isLoaded: true }),
}));

vi.mock("convex/react", () => ({
  useMutation: () => vi.fn().mockResolvedValue("mock-id"),
  useQuery: () => null,
}));

vi.mock("../../../convex/_generated/api", () => ({
  api: {
    meetings: {
      create: "api.meetings.create",
    },
  },
}));

describe("useCreateMeeting Hook", () => {
  const mockDict = {
    page: {
      createMeeting: {
        validate: {
          meeting__name: { required: "req", min: "min", max: "max" },
          meeting__place: { max: "max" },
          meeting__link: "url",
          date: { required: "req", max: "max" },
        },
        step: {
          one: { title: "title1" },
          two: { title: "title2" },
          three: { title: "title3" },
        },
        error: { createFailed: "failed" },
      },
    },
  };

  it("should initialize with default states", () => {
    const { result } = renderHook(() =>
      useCreateMeeting({ lang: "en" as any, dict: mockDict }),
    );
    expect(result.current.currStep).toBe(0);
    expect(result.current.mainFromTime).toBe(9);
    expect(result.current.mainToTime).toBe(17);
    expect(result.current.selectedDates).toEqual([]);
    expect(result.current.dailyTimeRanges).toEqual([]);
  });

  it("should update dailyTimeRanges correctly when mainToTime changes", () => {
    const { result } = renderHook(() =>
      useCreateMeeting({ lang: "en" as any, dict: mockDict }),
    );

    act(() => {
      result.current.setSelectedDates([1713500000000]);
      result.current.setMainToTime(10);
    });

    expect(result.current.dailyTimeRanges.length).toBe(1);
    expect(result.current.dailyTimeRanges[0].date).toBe(1713500000000);
    // from 9 to 10 is 1 hour, meaning 2 half-hour blocks
    expect(result.current.dailyTimeRanges[0].times.length).toBe(2);
  });

  it("should properly push and pop individual timecells (Option 3)", () => {
    const { result } = renderHook(() =>
      useCreateMeeting({ lang: "en" as any, dict: mockDict }),
    );
    const sampleDate = 1713500000000;

    act(() => {
      result.current.setSelectedDates([sampleDate]);
      result.current.setMainToTime(10);
    });

    const initTimeLength = result.current.dailyTimeRanges[0].times.length;
    const timeToRemove = result.current.dailyTimeRanges[0].times[0];

    act(() => {
      result.current.popUnselectedTimecell(sampleDate, timeToRemove);
    });

    expect(result.current.dailyTimeRanges[0].times.length).toBe(
      initTimeLength - 1,
    );

    act(() => {
      result.current.pushSelectedTimecell(sampleDate, timeToRemove);
    });

    expect(result.current.dailyTimeRanges[0].times.length).toBe(initTimeLength);
  });

  it("should properly handle daily hour changes (Option 2)", () => {
    const { result } = renderHook(() =>
      useCreateMeeting({ lang: "en" as any, dict: mockDict }),
    );
    const sampleDate = 1713500000000;

    act(() => {
      result.current.setSelectedDates([sampleDate]);
      result.current.handleDailyHourChange(sampleDate, "to", 11);
    });

    expect(result.current.dailyTimeRanges[0].times.length).toBe(4); // 9:00 to 11:00 = 2h = 4 blocks
  });
});
