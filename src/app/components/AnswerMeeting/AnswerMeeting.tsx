"use client";

import Collapse from "@/components/ui/Collapse";
import SlidingPill from "@/components/ui/SlidingPill";
import { useUser } from "@/lib/useAppUser";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import _ from "lodash";
import moment from "moment";
import "moment/locale/pl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { useMediaQuery } from "react-responsive";
import { z } from "zod";
import { api } from "../../../../convex/_generated/api";

import Button from "@/components/Button";
import CopyLinkButton from "@/components/CopyLinkButton";
import Heading from "@/components/Heading";
import Input from "@/components/Input";
import Title from "@/components/Title";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { rememberMeeting } from "@/lib/recentMeetings";
import {
  DEFAULT_BRAND_COLOR,
  errorCode,
  errorText,
  fmt,
  plural,
  textOn,
} from "@/lib/utils";
import {
  Building2,
  CalendarPlus,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  Globe,
  HelpCircle,
  Link2,
  Mail,
  MapPin,
  Sparkles,
} from "lucide-react";

import { getAvailabilityInfo } from "@/utils/meeting/answer/getAvailabilityInfo";
import { getUnavailableUsersInfo } from "@/utils/meeting/answer/getUnavailableUsersInfo";
import { Locale } from "@root/i18n.config";
import {
  isSlotAvailable,
  type AvailabilityRules,
} from "../../../utils/meeting/availabilityCore";
import { buildIcs, googleCalendarUrl } from "../../../utils/meeting/calendar";
import { pendingMembers as getPendingMembers } from "../../../utils/meeting/participants";

const DEFAULT_DURATION_MINUTES = 60;
/** Shared by active and disabled cells so columns line up on every breakpoint. */
const CELL_SIZE = "h-10 w-16 sm:w-20 lg:h-6 lg:w-12";
const HELP_KEY = "meetifynow_grid_help";
const USERNAME_KEY = "meetifynow_username";
/** Below this many answers recommendations are mostly noise. */
const MIN_ANSWERS_TO_RECOMMEND = 2;

class MeetingDate {
  meetDate: number;
  isOnline: boolean;
  constructor(meetDate: number, isOnline: boolean) {
    this.meetDate = meetDate;
    this.isOnline = isOnline;
  }
}

export default function AnswerMeeting({
  lang,
  dict,
  meetingData,
}: {
  lang: Locale;
  dict: any;
  meetingData: any;
}) {
  moment.locale(lang);
  const { user } = useUser();
  const confirm = useConfirm();
  const t = dict.page.answerMeeting;
  const addAnswer = useMutation(api.meetings.addAnswer);
  const updateAnswer = useMutation(api.meetings.updateAnswer);
  const doFinalize = useMutation(api.workspaces.finalizeMeeting);
  const doClearFinalDate = useMutation(api.workspaces.clearFinalDate);
  const doSendFillReminder = useMutation(api.workspaces.sendFillReminderEmail);

  const liveData = useQuery(api.meetings.getByAppointmentId, {
    appointmentId: meetingData.appointmentId,
  });
  const currentMeeting = liveData ?? meetingData;

  const workspaceData = useQuery(
    api.workspaces.getById,
    currentMeeting.workspaceId
      ? { workspaceId: currentMeeting.workspaceId }
      : "skip",
  );
  const organizerRulesDoc = useQuery(
    api.availability.getAvailabilityRules,
    (currentMeeting as any).createdBy
      ? { userId: (currentMeeting as any).createdBy }
      : "skip",
  );
  const organizerExceptions = useQuery(
    api.availability.getExceptions,
    (currentMeeting as any).createdBy
      ? { userId: (currentMeeting as any).createdBy }
      : "skip",
  );

  const workspaceMembers = useQuery(
    api.workspaces.getMembersByWorkspaceId,
    currentMeeting.workspaceId
      ? { workspaceId: currentMeeting.workspaceId }
      : "skip",
  );

  // Current user's own availability (only relevant when they're NOT the organizer)
  const isOrganizer = !!user && (currentMeeting as any).createdBy === user.id;
  const durationMinutes: number =
    (currentMeeting as any).durationMinutes ?? DEFAULT_DURATION_MINUTES;
  const userOwnRulesDoc = useQuery(
    api.availability.getAvailabilityRules,
    user && !isOrganizer ? { userId: user.id } : "skip",
  );
  const userOwnExceptions = useQuery(
    api.availability.getExceptions,
    user && !isOrganizer ? { userId: user.id } : "skip",
  );
  // The signed-in user's own meetings: conflicts for participants, buffers for the organizer.
  const myMeetings = useQuery(api.meetings.listMine, user ? {} : "skip");
  const myOtherConfirmed = useMemo(
    () =>
      (myMeetings ?? [])
        .filter(
          (m) =>
            m.finalDate &&
            m.status !== "cancelled" &&
            m.appointmentId !== currentMeeting.appointmentId,
        )
        .map((m) => ({
          finalDate: m.finalDate as number,
          durationMinutes: m.durationMinutes ?? DEFAULT_DURATION_MINUTES,
        })),
    [myMeetings, currentMeeting.appointmentId],
  );

  const staticMeetingData = useMemo(
    () => ({
      meetName: currentMeeting.meetName,
      appointmentId: currentMeeting.appointmentId,
      meetPlace: currentMeeting.meetPlace,
      meetLink: currentMeeting.meetLink,
      requiredParticipants: (currentMeeting as any).requiredParticipants as
        | string[]
        | undefined,
      dates:
        currentMeeting.dates
          ?.slice()
          .sort((a: any, b: any) => a.date - b.date) ?? [],
    }),
    [currentMeeting],
  );

  const flatTimes = useMemo(
    () => staticMeetingData.dates.flatMap((d: any) => d.times as number[]),
    [staticMeetingData.dates],
  );

  const timeRange = useMemo(() => {
    if (flatTimes.length === 0) return null;

    const dailyMinMax = staticMeetingData.dates.map((dateObj: any) => {
      const times: number[] = dateObj.times ?? [];
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);
      return {
        date: dateObj.date,
        minHour: moment(minTime).hour(),
        minMinute: moment(minTime).minute(),
        maxHour: moment(maxTime).hour(),
        maxMinute: moment(maxTime).minute(),
        dayMinTime: minTime,
        dayMaxTime: maxTime,
      };
    });

    const globalMinHour = Math.min(...dailyMinMax.map((d: any) => d.minHour));
    const globalMaxHour = Math.max(...dailyMinMax.map((d: any) => d.maxHour));

    const daysWithMinHour = dailyMinMax.filter(
      (d: any) => d.minHour === globalMinHour,
    );
    const daysWithMaxHour = dailyMinMax.filter(
      (d: any) => d.maxHour === globalMaxHour,
    );
    const globalMinMinute = Math.min(
      ...daysWithMinHour.map((d: any) => d.minMinute),
    );
    const globalMaxMinute = Math.max(
      ...daysWithMaxHour.map((d: any) => d.maxMinute),
    );

    const dayWithMin = daysWithMinHour.find(
      (d: any) => d.minMinute === globalMinMinute,
    );
    const dayWithMax = daysWithMaxHour.find(
      (d: any) => d.maxMinute === globalMaxMinute,
    );

    return {
      minTime: dayWithMin?.dayMinTime ?? Math.min(...flatTimes),
      maxTime: dayWithMax?.dayMaxTime ?? Math.max(...flatTimes),
      minimumTimeHour: globalMinHour,
      maximumTimeHour: globalMaxHour,
      isMinimumTimeHalfHour: globalMinMinute === 30,
      isMaximumTimeHalfHour: globalMaxMinute === 30,
    };
  }, [flatTimes, staticMeetingData.dates]);

  const rawAnswers: any[] = currentMeeting.answers ?? [];
  const [meetName, setMeetName] = useState(staticMeetingData.meetName);

  useEffect(() => {
    setMeetName(currentMeeting.meetName);
  }, [currentMeeting.meetName]);

  const [selectedTimecells, setSelectedTimecells] = useState<MeetingDate[]>([]);
  const [lookedUpDatetime, setLookedUpDatetime] = useState<number>();
  const [lookedUpDate, setLookedUpDate] = useState<string>();
  const [lookedUpTime, setLookedUpTime] = useState<string>();
  const [mobileAnsweringMode, setMobileAnsweringMode] = useState(true);
  // Explicit "in person / online" mode replaces the hidden click cycle.
  const [isOnlineMode, setIsOnlineMode] = useState(false);
  // Action applied while dragging over cells; null when not dragging.
  const [dragAction, setDragAction] = useState<"add" | "remove" | null>(null);
  const [isSendingReq, setIsSendingReq] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [answerSent, setAnswerSent] = useState(false);
  const [username, setUsername] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [availableCount, setAvailableCount] = useState(0);
  const [finalizingSlot, setFinalizingSlot] = useState<number | null>(null);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);
  const [isChangingDate, setIsChangingDate] = useState(false);
  const [isSendingFillReminder, setIsSendingFillReminder] = useState(false);
  const [fillReminderSent, setFillReminderSent] = useState(false);
  const [fillReminderError, setFillReminderError] = useState<string | null>(
    null,
  );
  // Help (instructions + legend): open for first-timers, collapsed once someone has answered any poll.
  const [showHelp, setShowHelp] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(HELP_KEY);
      const answeredBefore =
        Object.keys(
          JSON.parse(localStorage.getItem("meetifynow_answers") || "{}"),
        ).length > 0;
      setShowHelp(saved ? saved === "shown" : !answeredBefore);
    } catch {
      setShowHelp(true);
    }
  }, []);
  const toggleHelp = () => {
    setShowHelp((open) => {
      try {
        localStorage.setItem(HELP_KEY, open ? "hidden" : "shown");
      } catch {}
      return !open;
    });
  };

  // After a date is confirmed, participants see the grid only on request.
  const [showGridAfterFinal, setShowGridAfterFinal] = useState(false);
  // Browser-only values; reading them during render would break hydration.
  const [viewerTz, setViewerTz] = useState<string | null>(null);
  const [pageUrl, setPageUrl] = useState("");
  useEffect(() => {
    setViewerTz(Intl.DateTimeFormat().resolvedOptions().timeZone);
    setPageUrl(window.location.href);
  }, []);

  const answers = useMemo(() => {
    let newAnswers = [...rawAnswers];
    const previewDates = selectedTimecells.map((m) => ({
      meetDate: m.meetDate,
      isOnline: m.isOnline,
    }));

    if (editId) {
      const idx = newAnswers.findIndex((a: any) => a.id === editId);
      if (idx !== -1) {
        newAnswers[idx] = {
          ...newAnswers[idx],
          username: username || newAnswers[idx].username,
          dates: previewDates,
        };
      }
    } else {
      if (previewDates.length > 0 || username) {
        newAnswers.push({
          id: "preview-id",
          username:
            username || dict.page.answerMeeting.input.name.label || "Ty",
          dates: previewDates,
        });
      }
    }
    return newAnswers;
  }, [rawAnswers, editId, username, selectedTimecells, dict]);

  const isMobile = useMediaQuery({ query: "(max-width: 1023px)" });

  useEffect(() => {
    const stopDrag = () => setDragAction(null);
    document.addEventListener("mouseup", stopDrag);
    return () => document.removeEventListener("mouseup", stopDrag);
  }, []);

  const availabilityInfo = useMemo(
    () => getAvailabilityInfo(answers),
    [answers],
  );

  /** Top 3 slots by votes (earlier first on ties) + who blocks the best one. */
  const recommendation = useMemo(() => {
    const required = staticMeetingData.requiredParticipants ?? [];
    const entries = (
      Object.entries(getAvailabilityInfo(rawAnswers)) as [
        string,
        {
          usersInfo: { userData: { username: string }; isOnline: boolean }[];
          onlineCount: number;
        },
      ][]
    )
      .map(([datetime, info]) => ({
        datetime: Number(datetime),
        info,
        missingRequired: required.filter(
          (r) =>
            !info.usersInfo.some(
              (u) => u.userData.username.toLowerCase() === r.toLowerCase(),
            ),
        ),
      }))
      .sort(
        (a, b) =>
          b.info.usersInfo.length - a.info.usersInfo.length ||
          a.datetime - b.datetime,
      );

    const matching = entries.filter((e) => e.missingRequired.length === 0);
    return {
      slots: matching.slice(0, 3),
      // Nothing fits every required person: show the closest slot and who is missing.
      closest: matching.length === 0 ? entries[0] : undefined,
    };
  }, [rawAnswers, staticMeetingData.requiredParticipants]);
  const recommendedSlots = recommendation.slots;
  // Collapsed by default so the grid stays near the top; the header previews slot #1.
  const [showBest, setShowBest] = useState(false);
  const bestSlot = recommendedSlots[0] ?? recommendation.closest;
  const bestPreview = bestSlot
    ? `${_.capitalize(moment(bestSlot.datetime).format("ddd, D MMM, HH:mm"))} (${bestSlot.info.usersInfo.length}/${rawAnswers.length})`
    : null;

  const highestAvailableCount = useMemo(() => {
    const counts = Object.values(availabilityInfo).map(
      (info: any) => info.usersInfo.length,
    );
    return counts.length > 0 ? Math.max(0, ...counts) : 0;
  }, [availabilityInfo]);

  // Same rules the server applies when the date is confirmed (validateSlot).
  const outsideAvailabilitySlots = useMemo(() => {
    if (!organizerRulesDoc) return new Set<number>();
    const rules: AvailabilityRules = {
      timezone: organizerRulesDoc.timezone,
      weeklySchedule: organizerRulesDoc.weeklySchedule,
      bufferBefore: organizerRulesDoc.bufferBefore,
      bufferAfter: organizerRulesDoc.bufferAfter,
      minNotice: organizerRulesDoc.minNotice,
      maxHorizon: organizerRulesDoc.maxHorizon,
    };
    const exceptions = organizerExceptions ?? [];
    // Only the organizer can see their own other meetings.
    const confirmed = isOrganizer ? myOtherConfirmed : [];
    const unavailable = new Set<number>();
    for (const time of flatTimes) {
      if (
        !isSlotAvailable(rules, exceptions, confirmed, time, durationMinutes)
      ) {
        unavailable.add(time);
      }
    }
    return unavailable;
  }, [
    organizerRulesDoc,
    organizerExceptions,
    flatTimes,
    isOrganizer,
    myOtherConfirmed,
    durationMinutes,
  ]);

  // Current user's own unavailable slots (schedule-blocked)
  const userOwnUnavailableSlots = useMemo(() => {
    if (!userOwnRulesDoc) return new Set<number>();
    const rules: AvailabilityRules = {
      timezone: userOwnRulesDoc.timezone,
      weeklySchedule: userOwnRulesDoc.weeklySchedule,
      bufferBefore: 0,
      bufferAfter: 0,
      minNotice: 0,
      maxHorizon: 36500,
    };
    const exceptions = userOwnExceptions ?? [];
    const unavailable = new Set<number>();
    for (const time of flatTimes) {
      if (!isSlotAvailable(rules, exceptions, [], time, durationMinutes, 0)) {
        unavailable.add(time);
      }
    }
    return unavailable;
  }, [userOwnRulesDoc, userOwnExceptions, flatTimes, durationMinutes]);

  // Slots that conflict with user's other confirmed meetings
  const userConflictSlots = useMemo(() => {
    const conflicts = new Set<number>();
    if (isOrganizer) return conflicts;
    const slotMs = durationMinutes * 60_000;
    for (const slotTime of flatTimes) {
      if (
        myOtherConfirmed.some(
          (m) =>
            m.finalDate < slotTime + slotMs &&
            m.finalDate + m.durationMinutes * 60_000 > slotTime,
        )
      )
        conflicts.add(slotTime);
    }
    return conflicts;
  }, [isOrganizer, myOtherConfirmed, flatTimes, durationMinutes]);

  // Workspace members who haven't answered yet (by Clerk id, then by name/e-mail)
  const pendingMembers = useMemo(
    () => getPendingMembers(workspaceMembers ?? [], rawAnswers),
    [workspaceMembers, rawAnswers],
  );

  const isDateSelected = useCallback(
    (dateTime: number) =>
      selectedTimecells.some((m) => m.meetDate === dateTime),
    [selectedTimecells],
  );

  const getSelectedTimecell = useCallback(
    (dateTime: number) =>
      selectedTimecells.find((m) => m.meetDate === dateTime),
    [selectedTimecells],
  );

  /** Clicking a cell already marked in the current mode removes it; otherwise it's (re)marked in the current mode. */
  const actionFor = useCallback(
    (dateTime: number): "add" | "remove" =>
      getSelectedTimecell(dateTime)?.isOnline === isOnlineMode
        ? "remove"
        : "add",
    [getSelectedTimecell, isOnlineMode],
  );

  const applyAction = useCallback(
    (dateTime: number, action: "add" | "remove") =>
      setSelectedTimecells((prev) => {
        const rest = prev.filter((m) => m.meetDate !== dateTime);
        return action === "add"
          ? [...rest, new MeetingDate(dateTime, isOnlineMode)]
          : rest;
      }),
    [isOnlineMode],
  );

  /** Day/hour shortcuts: select all given slots in the current mode, or clear them if already selected. */
  const toggleMany = useCallback(
    (dateTimes: number[]) =>
      setSelectedTimecells((prev) => {
        const allSelected = dateTimes.every((dt) =>
          prev.some((m) => m.meetDate === dt && m.isOnline === isOnlineMode),
        );
        const rest = prev.filter((m) => !dateTimes.includes(m.meetDate));
        return allSelected
          ? rest
          : [
              ...rest,
              ...dateTimes.map((dt) => new MeetingDate(dt, isOnlineMode)),
            ];
      }),
    [isOnlineMode],
  );

  // Every slot is in the past: answering no longer makes sense.
  const isPollPast = useMemo(
    () => flatTimes.length > 0 && Math.max(...flatTimes) < Date.now(),
    [flatTimes],
  );
  const canAnswer = (!isMobile || mobileAnsweringMode) && !isPollPast;

  const convertDatetimeToDate = useCallback((datetime: number) => {
    const date = moment(datetime);
    setLookedUpDate(
      `${date.format("DD.MM")} ${_.capitalize(date.format("dddd"))}`,
    );
    setLookedUpTime(date.format("HH:mm"));
  }, []);

  const isAnswered = useCallback(
    (datetime: number) =>
      answers.some((a: any) =>
        a.dates.some((d: any) => d.meetDate === datetime),
      ),
    [answers],
  );

  const daysHeadings = useMemo(
    () =>
      staticMeetingData.dates.map((day: any) => {
        const d = moment(day.date);
        const label = (
          <>
            <span className="block text-sm text-dark font-medium">
              {`${d.date().toString().padStart(2, "0")}.${(d.month() + 1).toString().padStart(2, "0")}`}
            </span>
            <span className="block text-dark">
              {_.capitalize(d.format("ddd"))}
            </span>
          </>
        );
        return (
          <th
            key={day.date}
            scope="col"
            className={`bg-background sticky top-0 z-10 ${d.day() === 0 ? "pr-4" : ""}`}
          >
            {canAnswer ? (
              <button
                type="button"
                onClick={() => toggleMany(day.times)}
                aria-label={fmt(t.selectDay, { day: d.format("dddd, D MMMM") })}
                title={t.selectDayHint}
                className="w-full rounded-lg px-1 py-0.5 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {label}
              </button>
            ) : (
              label
            )}
          </th>
        );
      }),
    [staticMeetingData.dates, canAnswer, toggleMany, t],
  );

  const availableTimecell = useCallback(
    (dateTime: number, isEndOfWeek: boolean) => {
      const cell = getSelectedTimecell(dateTime);
      const dateVotes = availabilityInfo[dateTime]?.usersInfo.length || 0;
      const isSelected = isDateSelected(dateTime);
      const isAnsweredDate = isAnswered(dateTime);
      const isOutsideAvailability =
        outsideAvailabilitySlots.size > 0 &&
        outsideAvailabilitySlots.has(dateTime);
      const isUserUnavailable =
        !isOrganizer &&
        (userOwnUnavailableSlots.has(dateTime) ||
          userConflictSlots.has(dateTime));

      const showInfo = () => {
        setLookedUpDatetime(dateTime);
        convertDatetimeToDate(dateTime);
      };

      // Tint only empty cells; on answered cells the corner dot is enough, so the heatmap stays readable.
      const userUnavailableBg =
        !isSelected && !isAnsweredDate && isUserUnavailable
          ? userConflictSlots.has(dateTime)
            ? "!bg-red-100 !border-red-300"
            : "!bg-orange-50 !border-orange-200"
          : "";
      const info = availabilityInfo[dateTime];
      const isMostlyOnline =
        !!info && info.onlineCount * 2 > info.usersInfo.length;
      // Heatmap: opacity grows with the share of people available.
      const heat =
        isAnsweredDate && !isSelected && info
          ? {
              backgroundColor: `rgba(39, 179, 70, ${(
                0.15 +
                0.85 * (info.usersInfo.length / Math.max(answers.length, 1))
              ).toFixed(2)})`,
            }
          : undefined;

      const m = moment(dateTime);
      const label = fmt(dict.page.answerMeeting.cellLabel, {
        date: m.format("dddd, D MMMM"),
        time: m.format("HH:mm"),
        count: dateVotes,
      });

      return (
        <td key={dateTime}>
          <button
            type="button"
            data-date={dateTime}
            date-votes={dateVotes}
            aria-label={label}
            aria-pressed={canAnswer ? isSelected : undefined}
            onMouseDown={(e) => {
              if (isMobile) return;
              e.preventDefault(); // no text selection / focus jump while dragging
              const action = actionFor(dateTime);
              setDragAction(action);
              applyAction(dateTime, action);
            }}
            onMouseEnter={() => {
              if (isMobile) return;
              if (dragAction) applyAction(dateTime, dragAction);
              showInfo();
            }}
            onFocus={showInfo}
            // Taps on mobile and keyboard activation (detail 0) arrive here; desktop mouse uses mousedown.
            onClick={(e) => {
              if (!isMobile && e.detail !== 0) return;
              showInfo();
              if (canAnswer) applyAction(dateTime, actionFor(dateTime));
            }}
            style={heat}
            className={`relative block rounded-lg ${CELL_SIZE} transition-[background-color,border-color,opacity,transform] duration-150 active:scale-90 ${isSelected ? "animate-pop" : ""} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark focus-visible:ring-offset-1 ${
              isOutsideAvailability && !isSelected ? "opacity-40" : ""
            } ${isEndOfWeek ? "mr-4" : ""} ${userUnavailableBg} ${
              isAnsweredDate
                ? `border-none ${
                    isSelected
                      ? cell?.isOnline
                        ? `bg-gold ${!isMobile ? "hover:bg-gold/50" : ""}`
                        : `bg-primary ${!isMobile ? "hover:bg-primary/50" : ""}`
                      : `answered ${!isMobile ? "hover:opacity-70 active:animate-cell-select" : ""} ${
                          info &&
                          info.usersInfo.length === highestAvailableCount
                            ? "ring-2 ring-inset ring-green-800/50"
                            : ""
                        }`
                  }`
                : `border border-gray ${!isMobile ? "hover:border-gray/50" : ""} ${
                    isSelected
                      ? `border-none ${
                          cell?.isOnline
                            ? `bg-gold ${!isMobile ? "hover:bg-gold/50" : ""}`
                            : `bg-primary ${!isMobile ? "hover:bg-primary/50" : ""}`
                        }`
                      : !isMobile && dragAction !== "remove"
                        ? "hover:border-none active:animate-cell-select hover:bg-primary"
                        : ""
                  }`
            }`}
          >
            {((isSelected && cell?.isOnline) ||
              (!isSelected && isAnsweredDate && isMostlyOnline)) && (
              <Globe
                className="pointer-events-none absolute inset-0 m-auto w-3 h-3 text-dark/70"
                aria-hidden
              />
            )}
            {isUserUnavailable && !isSelected && (
              <span
                className="pointer-events-none absolute bottom-0.5 right-0.5 h-2 w-2 rounded-full border border-white/60"
                style={{
                  background: userConflictSlots.has(dateTime)
                    ? "#ef4444"
                    : "#f97316",
                }}
              />
            )}
          </button>
        </td>
      );
    },
    [
      isMobile,
      canAnswer,
      answers.length,
      getSelectedTimecell,
      availabilityInfo,
      isDateSelected,
      isAnswered,
      dragAction,
      actionFor,
      applyAction,
      convertDatetimeToDate,
      highestAvailableCount,
      outsideAvailabilitySlots,
      isOrganizer,
      userOwnUnavailableSlots,
      userConflictSlots,
      dict,
    ],
  );

  const timeCells = useMemo(() => {
    if (!timeRange) return [];

    const disabledTimecell = () => (
      <td>
        <div
          className={`rounded-lg ${CELL_SIZE} bg-light-gray cursor-default`}
        />
      </td>
    );

    const cells: JSX.Element[] = [];

    for (
      let i = timeRange.minimumTimeHour;
      i <= timeRange.maximumTimeHour;
      i++
    ) {
      for (let h = 0; h < 2; h++) {
        const isHalfHour = h === 1;

        if (
          i === timeRange.maximumTimeHour &&
          isHalfHour &&
          !timeRange.isMaximumTimeHalfHour
        )
          break;
        if (
          i === timeRange.minimumTimeHour &&
          !isHalfHour &&
          timeRange.isMinimumTimeHalfHour
        )
          continue;

        const timeRow: JSX.Element[] = [];

        for (const date of staticMeetingData.dates) {
          const dateTime = moment(date.date)
            .hour(i)
            .minute(isHalfHour ? 30 : 0)
            .valueOf();
          const isEndOfWeek = moment(dateTime).day() === 0;
          const isTimeAvailable = flatTimes.includes(dateTime);

          timeRow.push(
            isTimeAvailable
              ? availableTimecell(dateTime, isEndOfWeek)
              : disabledTimecell(),
          );
        }

        const showLabel =
          (h === 0 &&
            !(
              i === timeRange.minimumTimeHour && timeRange.isMinimumTimeHalfHour
            )) ||
          (h === 1 &&
            i === timeRange.minimumTimeHour &&
            timeRange.isMinimumTimeHalfHour) ||
          (h === 1 &&
            i === timeRange.maximumTimeHour &&
            !timeRange.isMaximumTimeHalfHour);

        cells.push(
          <tr
            key={`${i}${isHalfHour ? "30" : "00"}`}
            className="cursor-pointer"
          >
            {showLabel && (
              <th
                rowSpan={isHalfHour ? 1 : 2}
                scope="row"
                className="text-right text-dark align-top bg-background sticky left-0 z-10 pr-2"
              >
                {(() => {
                  const label =
                    (i === timeRange.minimumTimeHour &&
                      timeRange.isMinimumTimeHalfHour) ||
                    isHalfHour
                      ? `${i.toString().padStart(2, "0")}:30`
                      : `${i.toString().padStart(2, "0")}:00`;
                  const hourSlots = flatTimes.filter(
                    (ts: number) => moment(ts).hour() === i,
                  );
                  return canAnswer && hourSlots.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => toggleMany(hourSlots)}
                      aria-label={fmt(t.selectHour, { time: label })}
                      title={t.selectHourHint}
                      className="rounded-md px-1 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      {label}
                    </button>
                  ) : (
                    label
                  );
                })()}
              </th>
            )}
            {timeRow}
          </tr>,
        );
      }
    }

    if (timeRange.isMaximumTimeHalfHour) {
      const endHour = timeRange.maximumTimeHour + 1;
      cells.push(
        <tr key={`${endHour}00`} className="cursor-pointer">
          <th className="text-right text-dark align-bottom bg-background sticky left-0 z-10 pr-2">
            {`${endHour.toString().padStart(2, "0")}:00`}
          </th>
        </tr>,
      );
    }

    return cells;
  }, [
    timeRange,
    staticMeetingData.dates,
    flatTimes,
    availableTimecell,
    canAnswer,
    toggleMany,
    t,
  ]);

  useEffect(() => {
    try {
      const lsData = localStorage.getItem("meetifynow_answers");
      if (lsData && currentMeeting?.answers) {
        const storedAnswers = JSON.parse(lsData);
        const myAnswerId = storedAnswers[staticMeetingData.appointmentId];
        if (myAnswerId && !editId) {
          const existingAnswer = currentMeeting.answers.find(
            (a: any) => a.id === myAnswerId,
          );
          if (existingAnswer) {
            setEditId(myAnswerId);
            setUsername(existingAnswer.username);
            setSelectedTimecells(
              existingAnswer.dates.map(
                (d: any) => new MeetingDate(d.meetDate, d.isOnline),
              ),
            );
          }
        }
      }
    } catch (e) {}
  }, [currentMeeting?.answers, staticMeetingData.appointmentId, editId]);

  const sendAnswer: SubmitHandler<any> = useCallback(async () => {
    if (isSendingReq || !username) return;
    setSendError(null);
    setIsSendingReq(true);
    try {
      if (editId) {
        await updateAnswer({
          appointmentId: staticMeetingData.appointmentId,
          answerId: editId,
          username,
          dates: selectedTimecells.map((m) => ({
            meetDate: m.meetDate,
            isOnline: m.isOnline,
          })),
        });
      } else {
        const res = await addAnswer({
          appointmentId: staticMeetingData.appointmentId,
          username,
          dates: selectedTimecells.map((m) => ({
            meetDate: m.meetDate,
            isOnline: m.isOnline,
          })),
        });

        if (res?.answerId) {
          setEditId(res.answerId);
          try {
            const lsData = JSON.parse(
              localStorage.getItem("meetifynow_answers") || "{}",
            );
            lsData[staticMeetingData.appointmentId] = res.answerId;
            localStorage.setItem("meetifynow_answers", JSON.stringify(lsData));
          } catch (storageErr) {}
        }
      }

      setAnswerSent(true);
      setTimeout(() => setAnswerSent(false), 4000);
      rememberMeeting({
        id: staticMeetingData.appointmentId,
        name: meetName,
        role: "answered",
      });
      try {
        localStorage.setItem(USERNAME_KEY, username.trim());
      } catch {}
    } catch (error) {
      setSendError(
        errorText(
          error,
          dict.errors,
          dict.page.answerMeeting.error.submitFailed,
        ),
      );
    } finally {
      setIsSendingReq(false);
    }
  }, [
    isSendingReq,
    username,
    selectedTimecells,
    staticMeetingData.appointmentId,
    editId,
    addAnswer,
    updateAnswer,
    dict,
  ]);

  const handleFinalize = useCallback(
    async (datetime: number) => {
      const r = t.recommended;
      const date = moment(datetime).format("dddd, D MMMM, HH:mm");
      const outside = outsideAvailabilitySlots.has(datetime);
      const ok = await confirm({
        title: fmt(r.confirmFinalize, { date }),
        description: outside ? r.confirmOutside : r.confirmFinalizeHint,
        confirmLabel: outside ? r.finalizeAnyway : r.finalize,
      });
      if (!ok) return;

      setFinalizingSlot(datetime);
      setFinalizeError(null);
      const finalize = (ignoreAvailability: boolean) =>
        doFinalize({
          appointmentId: staticMeetingData.appointmentId,
          finalDate: datetime,
          organizerEmail: user?.emailAddresses?.[0]?.emailAddress ?? undefined,
          ignoreAvailability,
        });
      try {
        try {
          await finalize(outside);
        } catch (err) {
          // The server can be stricter than the cached rules (e.g. a meeting confirmed elsewhere).
          if (errorCode(err) !== "OUTSIDE_AVAILABILITY") throw err;
          if (
            !(await confirm({
              title: fmt(r.confirmFinalize, { date }),
              description: r.confirmOutside,
              confirmLabel: r.finalizeAnyway,
            }))
          )
            return;
          await finalize(true);
        }
      } catch (err) {
        setFinalizeError(errorText(err, dict.errors, r.finalizeFailed));
      } finally {
        setFinalizingSlot(null);
      }
    },
    [
      doFinalize,
      staticMeetingData.appointmentId,
      user,
      dict,
      t,
      confirm,
      outsideAvailabilitySlots,
    ],
  );

  const handleClearFinalDate = useCallback(async () => {
    const ok = await confirm({
      title: t.finalized.confirmChange,
      confirmLabel: t.finalized.change,
      destructive: true,
    });
    if (!ok) return;
    setIsChangingDate(true);
    setFinalizeError(null);
    try {
      await doClearFinalDate({
        appointmentId: staticMeetingData.appointmentId,
      });
    } catch (err) {
      setFinalizeError(errorText(err, dict.errors, t.finalized.changeFailed));
    } finally {
      setIsChangingDate(false);
    }
  }, [doClearFinalDate, staticMeetingData.appointmentId, dict, t, confirm]);

  const handleSendFillReminder = useCallback(async () => {
    setIsSendingFillReminder(true);
    setFillReminderSent(false);
    setFillReminderError(null);
    try {
      await doSendFillReminder({
        appointmentId: staticMeetingData.appointmentId,
      });
      setFillReminderSent(true);
      setTimeout(() => setFillReminderSent(false), 4000);
    } catch (err) {
      setFillReminderError(errorText(err, dict.errors, dict.errors.GENERIC));
    } finally {
      setIsSendingFillReminder(false);
    }
  }, [doSendFillReminder, staticMeetingData.appointmentId, dict]);

  useEffect(() => {
    if (lookedUpDatetime && availabilityInfo[lookedUpDatetime]) {
      setAvailableCount(availabilityInfo[lookedUpDatetime].usersInfo.length);
    } else {
      setAvailableCount(0);
    }
  }, [lookedUpDatetime, availabilityInfo]);

  const availabilityInfoContent = useMemo(() => {
    if (!lookedUpDatetime) {
      return isMobile ? (
        <span>{dict.page.answerMeeting.clickToReveal}</span>
      ) : (
        <span>{dict.page.answerMeeting.hoverToReveal}</span>
      );
    }

    if (!availabilityInfo[lookedUpDatetime]) {
      return (
        <span className="text-dark">
          {dict.page.answerMeeting.nobodyAvailable}
        </span>
      );
    }

    const dayInfo = availabilityInfo[lookedUpDatetime];
    const availableUsers = [...(dayInfo?.usersInfo ?? [])].sort(
      (a: any, b: any) =>
        a.userData.username.localeCompare(b.userData.username),
    );

    const onlineUsers = availableUsers.filter((u: any) => u.isOnline);
    const offlineUsers = availableUsers.filter((u: any) => !u.isOnline);
    const unavailableUsers = getUnavailableUsersInfo(answers, availableUsers);

    return (
      <ul>
        {onlineUsers.map((u: any) => (
          <li key={u.userData.userId} className="flex items-center">
            <span className="block h-3 w-3 rounded-full bg-gold mr-2" />
            <span>{u.userData.username}</span>
          </li>
        ))}
        {offlineUsers.map((u: any) => (
          <li key={u.userData.userId} className="flex items-center">
            <span className="block h-3 w-3 rounded-full bg-primary mr-2" />
            <span>{u.userData.username}</span>
          </li>
        ))}
        {unavailableUsers?.map((u: any) => (
          <li key={u.id || u.username} className="text-gray flex items-center">
            <span className="block h-3 w-3 rounded-full bg-gray mr-2" />
            <s>{u.username}</s>
          </li>
        ))}
      </ul>
    );
  }, [lookedUpDatetime, availabilityInfo, answers, isMobile, dict]);

  const formSchema = z.object({
    name: z
      .string({
        required_error: dict.page.answerMeeting.validate.name.required,
      })
      .trim()
      .min(1, dict.page.answerMeeting.validate.name.required)
      .max(20, dict.page.answerMeeting.validate.name.max),
  });

  const {
    register,
    handleSubmit,
    setValue, // Added target: Extract setValue to manually update the RHF value
    formState: { errors },
  } = useForm({ resolver: zodResolver(formSchema) });

  // Auto-fill username from logged-in Clerk user (only when not in edit mode)
  useEffect(() => {
    if (user && !editId) {
      setUsername(user.fullName ?? user.firstName ?? "");
    }
  }, [user, editId]);

  // Anonymous participants: reuse the name from their previous poll.
  useEffect(() => {
    if (user || editId) return;
    try {
      const saved = localStorage.getItem(USERNAME_KEY);
      if (saved) setUsername((current) => current || saved);
    } catch {}
  }, [user, editId]);

  // Sync react-hook-form value with username state
  useEffect(() => {
    if (username) {
      setValue("name", username);
    }
  }, [username, setValue]);

  const finalDate = (currentMeeting as any).finalDate as number | undefined;
  const brandColor = workspaceData?.brandingColor ?? DEFAULT_BRAND_COLOR;
  const requiredNames = staticMeetingData.requiredParticipants ?? [];
  // Once a date is confirmed participants mainly need the date; the grid stays one click away.
  const gridHidden = !!finalDate && !isOrganizer && !showGridAfterFinal;
  const showAnswering = canAnswer && !gridHidden;
  const hasPreview = answers.length > rawAnswers.length;
  const organizerTz = (currentMeeting as any).timezone as string | undefined;
  const calendarEvent = finalDate
    ? {
        uid: staticMeetingData.appointmentId,
        title: meetName,
        start: finalDate,
        durationMinutes,
        location: staticMeetingData.meetLink ?? staticMeetingData.meetPlace,
        url: pageUrl,
      }
    : null;
  const downloadIcs = () => {
    if (!calendarEvent) return;
    const blob = new Blob([buildIcs(calendarEvent)], { type: "text/calendar" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "meeting.ics";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const legendItems: { swatch: string; label: string; online?: boolean }[] = [
    { swatch: "bg-primary", label: t.legend.yourOffline },
    { swatch: "bg-gold", label: t.legend.yourOnline, online: true },
    {
      swatch: "bg-gradient-to-r from-green/20 to-green",
      label: t.legend.heat,
    },
    {
      swatch: "bg-green ring-2 ring-inset ring-green-800/50",
      label: t.legend.best,
    },
    { swatch: "bg-green/40", label: t.legend.mostlyOnline, online: true },
    { swatch: "bg-light-gray", label: t.legend.unavailable },
  ];

  return (
    <main className="flex md:flex-1 flex-col w-full max-w-[960px] px-4 sm:px-5 py-10 pt-28 lg:px-12 lg:pt-32">
      {workspaceData && (
        <div className="flex items-center gap-2 mb-3">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
            style={{ backgroundColor: brandColor, color: textOn(brandColor) }}
          >
            <Building2 className="w-3.5 h-3.5" aria-hidden />
            {workspaceData.name}
          </span>
        </div>
      )}
      <Title text={meetName} />
      {(staticMeetingData.meetPlace || staticMeetingData.meetLink) && (
        <div className="-mt-6 mb-8 flex flex-col gap-1.5">
          {staticMeetingData.meetPlace && (
            <p className="flex items-center gap-2 text-dark">
              <MapPin className="w-4 h-4 text-gray-500 shrink-0" aria-hidden />
              {staticMeetingData.meetPlace}
            </p>
          )}
          {staticMeetingData.meetLink && (
            <p className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-gray-500 shrink-0" aria-hidden />
              <a
                href={staticMeetingData.meetLink}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-dark underline underline-offset-4 hover:text-primary-active rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {t.meetingLink}
              </a>
            </p>
          )}
        </div>
      )}

      {/* Confirmed date – visible to everyone, editable by the organizer */}
      {!!finalDate && !isChangingDate && (
        <div
          role="status"
          className="animate-in fade-in-0 slide-in-from-top-1 duration-300 mb-8 p-4 bg-green-50 border border-green-200 rounded-xl"
        >
          <p className="flex items-center gap-1.5 text-xs font-semibold text-green-800 uppercase tracking-wide mb-1">
            <CheckCircle2 className="w-4 h-4" aria-hidden />
            {t.finalized.title}
          </p>
          <p className="text-base font-semibold text-dark">
            {_.capitalize(moment(finalDate).format("dddd, D MMMM YYYY, HH:mm"))}
          </p>
          <p className="text-sm text-gray-700 mt-1">
            {fmt(t.finalized.duration, { minutes: durationMinutes })}
            {viewerTz && ` · ${viewerTz.replace(/_/g, " ")}`}
          </p>
          {!isOrganizer && (
            <p className="text-sm text-gray-700 mt-1">
              {t.finalized.participantInfo}
            </p>
          )}
          {calendarEvent && (
            <div className="flex flex-wrap gap-2 mt-3">
              <a
                href={googleCalendarUrl(calendarEvent)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white bg-dark hover:bg-dark/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <CalendarPlus className="w-4 h-4" aria-hidden />
                {t.finalized.addToGoogle}
              </a>
              <button
                type="button"
                onClick={downloadIcs}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-dark bg-white border border-dark/15 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Download className="w-4 h-4" aria-hidden />
                {t.finalized.downloadIcs}
              </button>
            </div>
          )}
          {gridHidden && (
            <button
              type="button"
              onClick={() => setShowGridAfterFinal(true)}
              className="mt-3 text-sm font-semibold text-gray-700 hover:text-dark underline underline-offset-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {t.finalized.showGrid}
            </button>
          )}
          {isOrganizer && (
            <>
              {finalizeError && (
                <p
                  role="alert"
                  className="animate-in fade-in-0 slide-in-from-top-1 duration-300 text-red-600 text-xs mt-2"
                >
                  {finalizeError}
                </p>
              )}
              <button
                type="button"
                onClick={handleClearFinalDate}
                className="mt-3 block text-sm font-semibold text-gray-700 hover:text-dark underline underline-offset-2 transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {t.finalized.change}
              </button>
            </>
          )}
        </div>
      )}

      {(!finalDate || isChangingDate) && rawAnswers.length > 0 && (
        <div className="mb-6 bg-primary/5 border border-primary/20 rounded-xl">
          <button
            type="button"
            onClick={() => setShowBest((open) => !open)}
            aria-expanded={showBest}
            aria-controls="best-times"
            className="w-full flex items-center gap-2 px-4 py-3 text-left rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Sparkles className="w-4 h-4 shrink-0 text-dark" aria-hidden />
            <span className="text-xs font-semibold text-dark uppercase tracking-wide shrink-0">
              {isOrganizer ? t.recommended.title : t.recommended.titlePublic}
            </span>
            {!showBest && bestPreview && (
              <span className="min-w-0 truncate text-sm text-gray-700">
                · {bestPreview}
              </span>
            )}
            <ChevronDown
              className={`w-4 h-4 ml-auto shrink-0 transition-transform duration-200 ${showBest ? "rotate-180" : ""}`}
              aria-hidden
            />
          </button>
          <Collapse open={showBest} id="best-times" className="px-4 pb-4">
            {requiredNames.length > 0 && (
              <p className="text-xs text-gray-600 mb-3">
                {t.recommended.requiredNote}
              </p>
            )}
            {finalizeError && (
              <p
                role="alert"
                className="animate-in fade-in-0 slide-in-from-top-1 duration-300 text-red-600 text-sm mb-3"
              >
                {finalizeError}
              </p>
            )}
            {rawAnswers.length < MIN_ANSWERS_TO_RECOMMEND && (
              <p className="text-sm text-gray-700 mb-3">
                {t.recommended.fewAnswers}
              </p>
            )}
            {recommendation.closest && (
              <p className="text-sm text-gray-700 mb-3">
                {fmt(t.recommended.noRequiredMatch, {
                  date: _.capitalize(
                    moment(recommendation.closest.datetime).format(
                      "dddd, D MMMM, HH:mm",
                    ),
                  ),
                  names: recommendation.closest.missingRequired.join(", "),
                })}
              </p>
            )}
            <ol className="flex flex-col gap-2">
              {recommendedSlots.map(({ datetime, info }, idx) => (
                <li
                  key={datetime}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1"
                >
                  <span
                    className="w-5 h-5 rounded-full bg-dark text-white text-xs flex items-center justify-center font-bold shrink-0"
                    aria-hidden
                  >
                    {idx + 1}
                  </span>
                  <span className="text-sm font-medium text-dark">
                    {_.capitalize(
                      moment(datetime).format("dddd, D MMMM, HH:mm"),
                    )}
                  </span>
                  <span className="text-xs text-gray-700">
                    {fmt(t.recommended.available, {
                      count: info.usersInfo.length,
                      total: rawAnswers.length,
                    })}
                  </span>
                  {isOrganizer && outsideAvailabilitySlots.has(datetime) && (
                    <span className="text-xs font-medium text-orange-800">
                      ⚠ {t.recommended.outside}
                    </span>
                  )}
                  {isOrganizer && (
                    <button
                      type="button"
                      disabled={finalizingSlot !== null}
                      onClick={() => handleFinalize(datetime)}
                      className="ml-auto text-xs font-semibold text-white bg-dark hover:bg-dark/90 disabled:opacity-50 px-3.5 py-2 rounded-full transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                      {finalizingSlot === datetime
                        ? "…"
                        : t.recommended.finalize}
                    </button>
                  )}
                </li>
              ))}
            </ol>
          </Collapse>
        </div>
      )}

      {isPollPast && !finalDate && (
        <p
          role="status"
          className="animate-in fade-in-0 slide-in-from-top-1 duration-300 mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          {t.pastNotice}
        </p>
      )}

      {isMobile && !gridHidden && !isPollPast && (
        <div
          role="tablist"
          className="grid grid-cols-2 gap-1 p-1 mb-5 bg-gray-100 rounded-2xl"
        >
          {[true, false].map((answering) => (
            <button
              key={String(answering)}
              type="button"
              role="tab"
              aria-selected={mobileAnsweringMode === answering}
              onClick={() => setMobileAnsweringMode(answering)}
              className={`relative isolate py-2.5 rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                mobileAnsweringMode === answering
                  ? "text-dark"
                  : "text-gray-600"
              }`}
            >
              {mobileAnsweringMode === answering && (
                <SlidingPill layoutId="answer-mobile-tab" />
              )}
              {answering
                ? t.toggleButton.answerMeeting
                : t.toggleButton.showAvailability}
            </button>
          ))}
        </div>
      )}

      {!gridHidden && (
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-10">
          {(!isMobile || !mobileAnsweringMode || isPollPast) && (
            <section className="availability__info w-full lg:w-1/2">
              <p className="text-sm text-gray-600 mb-3">
                {plural(t.responseCount, rawAnswers.length, lang)}
                {hasPreview && (
                  <span className="text-gray-500"> · {t.previewNote}</span>
                )}
              </p>

              {/* Workspace members response status (visible to organizer) */}
              {isOrganizer &&
                workspaceMembers &&
                workspaceMembers.length > 0 && (
                  <div className="mb-4 p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                      {fmt(t.workspace.participants, {
                        answered:
                          workspaceMembers.length - pendingMembers.length,
                        total: workspaceMembers.length,
                      })}
                    </p>
                    <ul className="flex flex-col gap-1">
                      {workspaceMembers.map((m: any) => {
                        const name = (m.displayName ||
                          m.invitedEmail ||
                          "?") as string;
                        const answered = !pendingMembers.includes(m);
                        return (
                          <li
                            key={m._id}
                            className="flex items-center gap-2 text-sm"
                          >
                            <span
                              aria-hidden
                              className={`shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                answered
                                  ? "bg-green/20 text-green-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {answered ? "✓" : "?"}
                            </span>
                            <span
                              className={`truncate ${answered ? "text-dark" : "text-amber-800 font-medium"}`}
                            >
                              {name}
                            </span>
                            {!answered && (
                              <span className="ml-auto shrink-0 text-[11px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded-full">
                                {t.workspace.missing}
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

              {isOrganizer &&
                currentMeeting?.workspaceId &&
                workspaceMembers &&
                pendingMembers.length > 0 && (
                  <button
                    type="button"
                    disabled={isSendingFillReminder}
                    onClick={handleSendFillReminder}
                    className="mb-4 w-full flex items-center justify-center gap-2 text-xs font-semibold text-orange-800 bg-orange-50 hover:bg-orange-100 disabled:opacity-50 border border-orange-200 rounded-lg px-3 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Mail className="w-3.5 h-3.5" aria-hidden />
                    {isSendingFillReminder
                      ? t.workspace.sending
                      : fillReminderSent
                        ? t.workspace.sent
                        : fmt(t.workspace.sendReminder, {
                            count: pendingMembers.length,
                          })}
                  </button>
                )}
              {fillReminderError && (
                <p
                  role="alert"
                  className="animate-in fade-in-0 slide-in-from-top-1 duration-300 -mt-2 mb-4 text-xs text-red-600"
                >
                  {fillReminderError}
                </p>
              )}

              <div aria-live="polite">
                {rawAnswers.length === 0 && !lookedUpDate ? (
                  <p className="text-dark italic text-sm mb-3">
                    {t.firstToAnswer}
                  </p>
                ) : (
                  <>
                    <p className="text-dark">
                      {lookedUpDate} {lookedUpTime}
                    </p>
                    {lookedUpDate && (
                      <Heading text={`${availableCount}/${answers.length}`} />
                    )}
                  </>
                )}
              </div>
              <div
                className={`overflow-auto ${isMobile ? "max-h-[160px]" : "max-h-[300px]"}`}
              >
                {availabilityInfoContent}
              </div>
            </section>
          )}

          <section className="flex flex-col w-full lg:w-1/2">
            <form className="flex flex-col" onSubmit={handleSubmit(sendAnswer)}>
              {showAnswering && (
                <div className="w-full flex flex-col gap-4 mb-4">
                  {user ? (
                    <p className="text-sm text-gray-600">
                      {t.answeringAs}{" "}
                      <span className="font-semibold text-dark">
                        {username}
                      </span>
                    </p>
                  ) : (
                    <Input
                      label={t.input.name.label}
                      type="text"
                      id="name"
                      register={register}
                      error={!!errors.name}
                      errorText={errors.name?.message?.toString()}
                      onChange={(e) => setUsername(e.target.value)}
                      value={username}
                      placeholder={t.input.name.placeholder}
                      name="name"
                      autocomplete="name"
                    />
                  )}

                  {!user && !editId && requiredNames.length > 0 && (
                    <div className="text-sm -mt-2">
                      <p className="text-gray-600 mb-2">
                        {t.requiredHint}{" "}
                        <span className="text-gray-500">
                          {t.requiredHintAction}
                        </span>
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {requiredNames.map((n) => (
                          <button
                            key={n}
                            type="button"
                            aria-pressed={username === n}
                            onClick={() => setUsername(n)}
                            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                              username === n
                                ? "bg-dark text-white border-dark"
                                : "bg-white text-gray-700 border-gray-200 hover:border-dark"
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <p
                      id="answer-mode-label"
                      className="text-sm font-medium text-gray-700 mb-2"
                    >
                      {t.mode.label}
                    </p>
                    <div
                      role="radiogroup"
                      aria-labelledby="answer-mode-label"
                      className="inline-flex gap-1 p-1 bg-gray-100 rounded-2xl"
                    >
                      {[false, true].map((online) => (
                        <button
                          key={String(online)}
                          type="button"
                          role="radio"
                          aria-checked={isOnlineMode === online}
                          onClick={() => setIsOnlineMode(online)}
                          className={`relative isolate flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                            isOnlineMode === online
                              ? "text-dark"
                              : "text-gray-600 hover:text-dark"
                          }`}
                        >
                          {isOnlineMode === online && (
                            <SlidingPill layoutId="answer-mode" />
                          )}
                          <span
                            aria-hidden
                            className={`relative w-3.5 h-3.5 rounded ${online ? "bg-gold" : "bg-primary"}`}
                          >
                            {online && (
                              <Globe className="absolute inset-0 m-auto w-2.5 h-2.5 text-dark/70" />
                            )}
                          </span>
                          {online ? t.mode.online : t.mode.offline}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {viewerTz && (
                <p className="flex items-center gap-1.5 text-xs text-gray-600 mb-2">
                  <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden />
                  {fmt(t.timezoneNote, {
                    tz: viewerTz.replace(/_/g, " "),
                    minutes: durationMinutes,
                  })}
                  {organizerTz && organizerTz !== viewerTz && (
                    <span>
                      {" "}
                      {fmt(t.organizerTimezone, {
                        tz: organizerTz.replace(/_/g, " "),
                      })}
                    </span>
                  )}
                </p>
              )}
              <div className="self-center lg:self-start overflow-auto max-h-[360px] md:max-h-[480px] lg:max-h-[340px] w-auto max-w-full pr-3">
                <table className="time__seclection--table w-fit self-center select-none">
                  <thead>
                    <tr>
                      <th className="bg-background sticky top-0 left-0 z-20" />
                      {daysHeadings}
                    </tr>
                  </thead>
                  <tbody>{timeCells}</tbody>
                </table>
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={toggleHelp}
                  aria-expanded={showHelp}
                  aria-controls="grid-help"
                  className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-dark rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <HelpCircle className="w-4 h-4" aria-hidden />
                  {t.help.toggle}
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${showHelp ? "rotate-180" : ""}`}
                    aria-hidden
                  />
                </button>
                <Collapse open={showHelp} id="grid-help" className="pt-3">
                  {showAnswering && (
                    <p className="text-xs text-gray-600 mb-3">{t.gridHint}</p>
                  )}
                  <p className="sr-only">{t.legend.title}</p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-gray-600">
                    {legendItems.map((item) => (
                      <li key={item.label} className="flex items-center gap-2">
                        <span
                          aria-hidden
                          className={`relative shrink-0 w-4 h-3 rounded ${item.swatch}`}
                        >
                          {item.online && (
                            <Globe className="absolute inset-0 m-auto w-2.5 h-2.5 text-dark/70" />
                          )}
                        </span>
                        {item.label}
                      </li>
                    ))}
                    {userOwnUnavailableSlots.size > 0 && (
                      <li className="flex items-center gap-2">
                        <span
                          aria-hidden
                          className="shrink-0 w-4 h-3 rounded bg-orange-100 border border-orange-200"
                        />
                        {t.legend.outsideYours}
                      </li>
                    )}
                    {userConflictSlots.size > 0 && (
                      <li className="flex items-center gap-2">
                        <span
                          aria-hidden
                          className="shrink-0 w-4 h-3 rounded bg-red-200 border border-red-300"
                        />
                        {t.legend.conflict}
                      </li>
                    )}
                  </ul>
                </Collapse>
              </div>

              {showAnswering && (
                <div className="flex flex-col items-center mt-6 w-full">
                  <div aria-live="polite" className="w-full">
                    {answerSent && (
                      <p className="animate-in fade-in-0 zoom-in-95 duration-300 text-green-700 font-medium text-sm mb-2 text-center">
                        ✓ {t.success}
                      </p>
                    )}
                    {editId && (
                      <p
                        role="status"
                        className="animate-in fade-in-0 slide-in-from-top-1 duration-300 mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-gray-800 text-center"
                      >
                        {t.savedNotice}
                      </p>
                    )}
                    {sendError && (
                      <p
                        role="alert"
                        className="animate-in fade-in-0 slide-in-from-top-1 duration-300 text-red-600 text-sm mb-4 text-center"
                      >
                        {sendError}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-row items-center justify-center gap-3 flex-wrap w-full">
                    <Button
                      text={
                        isSendingReq
                          ? t.sending
                          : editId
                            ? t.button.update
                            : t.button.submit
                      }
                      type="submit"
                      disabled={isSendingReq}
                      className="m-0"
                    />
                    <CopyLinkButton
                      dict={dict}
                      shareTitle={meetName}
                      className="m-0"
                    />
                  </div>
                </div>
              )}
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
