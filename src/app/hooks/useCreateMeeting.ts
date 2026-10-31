import { useUser } from "@/lib/useAppUser";
import { zodResolver } from "@hookform/resolvers/zod";
import { rememberMeeting } from "@/lib/recentMeetings";
import { errorText } from "@/lib/utils";
import { Locale } from "@root/i18n.config";
import { useMutation, useQuery } from "convex/react";
import moment from "moment";
import "moment/locale/pl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { z } from "zod";
import { api } from "../../../convex/_generated/api";

export interface DailyTimeRange {
  date: number;
  times: number[];
}

export type DailyHours = {
  [date: number]: { from: number; to: number };
};

type Inputs = {
  meeting__name: string;
  meeting__place?: string;
  meeting__link?: string;
};

const DRAFT_KEY = "meetifynow_draft";

export const useCreateMeeting = ({
  lang,
  dict,
}: {
  lang: Locale;
  dict: any;
}) => {
  moment.locale(lang);
  const router = useRouter();
  const { user } = useUser();
  const ownedWorkspace = useQuery(api.workspaces.getOwned, user ? {} : "skip");
  const memberships = useQuery(
    api.workspaces.getMemberships,
    user && ownedWorkspace === null ? {} : "skip",
  );
  // Members create meetings in the workspace they belong to, like owners do.
  const workspace = ownedWorkspace ?? memberships?.[0] ?? null;
  const createMeetingMutation = useMutation(api.meetings.create);

  const [prevStep, setPrevStep] = useState(0);
  const [currStep, setCurrStep] = useState(0);
  const [timepickerIndex, setTimepickerIndex] = useState(0);
  const [meetDetails, setMeetDetails] = useState({
    name: "",
    place: "",
    link: "",
  });
  const [dailyTimeRanges, setDailyTimeRanges] = useState<DailyTimeRange[]>([]);
  const [selectedDates, setSelectedDates] = useState<number[]>([]);
  const [dateError, setDateError] = useState(false);
  const [dateErrorText, setDateErrorText] = useState("");
  const [isRequestInProgress, setIsRequestInProgress] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdAppointmentId, setCreatedAppointmentId] = useState<
    string | null
  >(null);
  const [dailyHours, setDailyHours] = useState<DailyHours>({});
  const [mainFromTime, setMainFromTime] = useState(9);
  const [mainToTime, setMainToTime] = useState(17);
  const [requiredParticipants, setRequiredParticipants] = useState<string[]>(
    [],
  );
  const [isPrivate, setIsPrivate] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState(60);

  const delta = currStep - prevStep;

  const formSchema = z.object({
    meeting__name: z
      .string({
        required_error: dict.page.createMeeting.validate.meeting__name.required,
      })
      .trim()
      .min(1, dict.page.createMeeting.validate.meeting__name.required)
      .min(2, dict.page.createMeeting.validate.meeting__name.min)
      .max(50, dict.page.createMeeting.validate.meeting__name.max),
    meeting__place: z
      .string()
      .max(100, dict.page.createMeeting.validate.meeting__place.max)
      .optional()
      .or(z.literal("")),
    meeting__link: z
      .string()
      .url(dict.page.createMeeting.validate.meeting__link)
      .optional()
      .or(z.literal("")),
  });

  const {
    register,
    handleSubmit,
    trigger,
    setValue,
    formState: { errors },
  } = useForm<Inputs>({ resolver: zodResolver(formSchema) });

  const stepsInfo = [
    {
      title: dict.page.createMeeting.step.one.title,
      fields: ["meeting__name", "meeting__place", "meeting__link"],
    },
    { title: dict.page.createMeeting.step.two.title },
    { title: dict.page.createMeeting.step.three.title },
  ];

  const convertDatetimeToTime = (datetime: number) => moment(datetime);
  const isDatetime = (datetime: number) => datetime.toString().length === 13;

  const getTimeRangeDatetimes = (
    datetime: number,
    from: number,
    to: number,
  ) => {
    const datetimes: number[] = [];
    if (isDatetime(from)) from = convertDatetimeToTime(from).hour();
    if (isDatetime(to)) to = convertDatetimeToTime(to).hour() + 1;

    for (let i = from; i < to; i++) {
      for (let hourHalf = 0; hourHalf < 2; hourHalf++) {
        datetimes.push(
          moment(datetime)
            .hour(i)
            .minute(hourHalf * 30)
            .valueOf(),
        );
      }
    }
    return datetimes;
  };

  const fillDailyTimeRanges = () => {
    const timeRanges: DailyTimeRange[] = selectedDates.map((date) => {
      const dayHours = dailyHours[date];
      return {
        date,
        times: getTimeRangeDatetimes(
          date,
          dayHours?.from ?? mainFromTime,
          dayHours?.to ?? mainToTime,
        ),
      };
    });
    setDailyTimeRanges(timeRanges);
  };

  const updateDailyTimeRanges = (
    dayDateTime: number,
    dateTime: number,
    add: boolean,
  ) => {
    setDailyTimeRanges((prev) => {
      const index = prev.findIndex((range) => range.date === dayDateTime);
      if (index === -1) return prev;
      const timeRange = prev[index];
      const newTimes = add
        ? [...timeRange.times, dateTime].sort()
        : timeRange.times.filter((t) => t !== dateTime);
      const updated = [...prev];
      updated[index] = { ...timeRange, times: newTimes };
      return updated;
    });
  };

  const pushSelectedTimecell = (dayDateTime: number, dateTime: number) =>
    updateDailyTimeRanges(dayDateTime, dateTime, true);
  const popUnselectedTimecell = (dayDateTime: number, dateTime: number) =>
    updateDailyTimeRanges(dayDateTime, dateTime, false);

  const handleDailyHourChange = (
    date: number,
    type: "from" | "to",
    value: number,
  ) => {
    setDailyHours((prev) => {
      const current = prev[date] || { from: mainFromTime, to: mainToTime };
      let { from, to } = current;
      if (type === "from") {
        from = value;
        if (from >= to) to = Math.min(from + 1, 24);
      } else {
        to = value;
        if (to <= from) from = Math.max(to - 1, 0);
      }
      return { ...prev, [date]: { from, to } };
    });
  };

  useEffect(() => {
    fillDailyTimeRanges();
  }, [dailyHours, mainFromTime, mainToTime]);

  // Draft in sessionStorage: a refresh or language switch keeps what was typed.
  const [draftLoaded, setDraftLoaded] = useState(false);
  useEffect(() => {
    try {
      const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null");
      if (draft) {
        const details = { name: "", place: "", link: "", ...draft.meetDetails };
        setMeetDetails(details);
        setValue("meeting__name", details.name);
        setValue("meeting__place", details.place);
        setValue("meeting__link", details.link);
        // Past days can't be picked any more.
        const today = moment().startOf("day").valueOf();
        setSelectedDates(
          (draft.selectedDates ?? []).filter((d: number) => d >= today),
        );
        setDurationMinutes(draft.durationMinutes ?? 60);
        setMainFromTime(draft.mainFromTime ?? 9);
        setMainToTime(draft.mainToTime ?? 17);
      }
    } catch {}
    setDraftLoaded(true);
  }, []);
  useEffect(() => {
    if (!draftLoaded || createdAppointmentId) return;
    try {
      sessionStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          meetDetails,
          selectedDates,
          durationMinutes,
          mainFromTime,
          mainToTime,
        }),
      );
    } catch {}
  }, [
    draftLoaded,
    createdAppointmentId,
    meetDetails,
    selectedDates,
    durationMinutes,
    mainFromTime,
    mainToTime,
  ]);

  const validateDate = () => {
    if (selectedDates.length < 1) {
      setDateError(true);
      setDateErrorText(dict.page.createMeeting.validate.date.required);
      return false;
    }
    if (selectedDates.length > 15) {
      setDateError(true);
      setDateErrorText(dict.page.createMeeting.validate.date.max);
      return false;
    }
    setDateError(false);
    setDateErrorText("");
    return true;
  };

  const createMeeting: SubmitHandler<Inputs> = async (data) => {
    if (isRequestInProgress || !validateDate()) return;
    setCreateError(null);
    setIsRequestInProgress(true);
    try {
      const appointmentId = await createMeetingMutation({
        meetName: data.meeting__name,
        meetPlace: data.meeting__place || undefined,
        meetLink: data.meeting__link || undefined,
        workspaceId: workspace?._id ?? undefined,
        dates: dailyTimeRanges,
        requiredParticipants:
          requiredParticipants.length > 0 ? requiredParticipants : undefined,
        isPrivate: (isPrivate && !!workspace) || undefined,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        lang: lang as "pl" | "en",
        durationMinutes,
      });
      setCreatedAppointmentId(appointmentId);
      setIsRequestInProgress(false);
      rememberMeeting({
        id: appointmentId,
        name: data.meeting__name.trim(),
        role: "created",
      });
      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {}
    } catch (error) {
      setCreateError(
        errorText(
          error,
          dict.errors,
          dict.page.createMeeting.error.createFailed,
        ),
      );
      setIsRequestInProgress(false);
    }
  };

  const next = async () => {
    if (currStep === 0) {
      const valid = await trigger(
        ["meeting__name", "meeting__place", "meeting__link"],
        {
          shouldFocus: true,
        },
      );
      if (!valid) return;
    }
    if (currStep === 1 && !validateDate()) return;

    if (currStep < stepsInfo.length - 1) {
      setPrevStep(currStep);
      setCurrStep(currStep + 1);
      if (currStep === 1) {
        setSelectedDates((d) => [...d].sort());
        fillDailyTimeRanges();
      }
    } else {
      await handleSubmit(createMeeting)();
    }
  };

  const prev = () => {
    if (currStep === 0) router.push("/");
    else {
      setPrevStep(currStep);
      setCurrStep(currStep - 1);
    }
  };

  return {
    currStep,
    delta,
    timepickerIndex,
    meetDetails,
    selectedDates,
    dateError,
    dateErrorText,
    errors,
    isRequestInProgress,
    createError,
    createdAppointmentId,
    dailyTimeRanges,
    mainFromTime,
    mainToTime,
    dailyHours,
    setMeetDetails,
    setTimepickerIndex,
    setSelectedDates,
    register,
    setValue,
    next,
    prev,
    stepsInfo,
    requiredParticipants,
    setRequiredParticipants,
    isPrivate,
    setIsPrivate,
    durationMinutes,
    setDurationMinutes,
    workspace,
    pushSelectedTimecell,
    popUnselectedTimecell,
    setMainFromTime,
    setMainToTime,
    handleDailyHourChange,
  };
};
