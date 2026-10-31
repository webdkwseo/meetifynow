"use client";

import Button from "@/components/Button";
import CopyLinkButton from "@/components/CopyLinkButton";
import DateSelectionStep from "@/components/CreateMeeting/DateSelectionStep";
import StepsIndicator from "@/components/CreateMeeting/StepsIndicator";
import TimeSelectionStep from "@/components/CreateMeeting/TimeSelectionStep";
import RecentMeetings from "@/components/RecentMeetings";
import Title from "@/components/Title";
import { useCreateMeeting } from "@/hooks/useCreateMeeting";
import { Locale } from "@root/i18n.config";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import AnswerMeetingLoader from "../AnswerMeeting/AnswerMeetingLoader";
import MeetingDetailsStep from "./MeetingDetailsStep";

export default function CreateMeeting({
  lang,
  dict,
}: {
  lang: Locale;
  dict: any;
}) {
  const router = useRouter();
  const {
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
    pushSelectedTimecell,
    popUnselectedTimecell,
    setMainFromTime,
    setMainToTime,
    handleDailyHourChange,
    requiredParticipants,
    setRequiredParticipants,
    isPrivate,
    setIsPrivate,
    durationMinutes,
    setDurationMinutes,
    workspace,
  } = useCreateMeeting({ lang, dict });
  const workspaceMembers = useQuery(
    api.workspaces.getMembersByWorkspaceId,
    workspace?._id ? { workspaceId: workspace._id } : "skip",
  );

  if (isRequestInProgress) {
    return <AnswerMeetingLoader />;
  }

  if (createdAppointmentId) {
    const meetingUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/${lang}/meet/${createdAppointmentId}`
        : `/${lang}/meet/${createdAppointmentId}`;

    return (
      <main className="flex md:flex-1 h-full flex-col items-center justify-center px-5 py-10 pt-28 lg:p-24 lg:pt-32">
        <div className="flex flex-col items-center text-center max-w-md">
          <div className="text-5xl mb-4">🎉</div>
          <Title text={dict.page.createMeeting.success.title} />
          <p className="text-dark mt-2 mb-4">
            {dict.page.createMeeting.success.subtitle}
          </p>
          <div className="w-full bg-light border border-light-gray rounded-lg px-4 py-2 mb-2 break-all text-sm text-dark select-all">
            {meetingUrl}
          </div>
          <CopyLinkButton
            url={meetingUrl}
            shareTitle={dict.page.createMeeting.success.title}
            dict={dict}
            className="mt-2"
          />
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Button
              text={dict.page.createMeeting.success.goToMeeting}
              onClick={() =>
                router.push(`/${lang}/meet/${createdAppointmentId}`)
              }
            />
            <button
              type="button"
              // Full reload: same route, so a client push would keep this success state.
              onClick={() => window.location.assign(`/${lang}/meet/new/`)}
              className="text-sm text-gray hover:text-dark underline underline-offset-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
            >
              {dict.page.createMeeting.success.createAnother}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex md:flex-1 h-full w-full flex-col px-4 sm:px-5 py-10 pt-28 lg:px-24 lg:pt-32 lg:m-0 justify-center">
      <div className="p-6 sm:p-8 md:p-12 max-w-5xl mx-auto w-full bg-white rounded-xl shadow-sm border border-dark/5">
        <Title text={dict.page.createMeeting.title} />
        <StepsIndicator
          steps={stepsInfo.length}
          stepsData={stepsInfo}
          currIndex={currStep}
        />
        <div
          id="create-meeting-form-container"
          className="flex flex-col min-h-[400px]"
        >
          <div className="w-full h-full flex flex-col">
            {currStep === 0 && (
              <MeetingDetailsStep
                delta={delta}
                register={register}
                setValue={setValue}
                errors={errors}
                dict={dict}
                setMeetDetails={setMeetDetails}
                meetDetails={meetDetails}
                requiredParticipants={requiredParticipants}
                setRequiredParticipants={setRequiredParticipants}
                workspaceMembers={workspaceMembers ?? []}
                isPrivate={isPrivate}
                setIsPrivate={setIsPrivate}
                hasWorkspace={!!workspace}
                durationMinutes={durationMinutes}
                setDurationMinutes={setDurationMinutes}
              />
            )}

            {currStep === 1 && (
              <DateSelectionStep
                delta={delta}
                selectedDates={[...selectedDates].sort((a, b) => a - b)}
                setSelectedDates={setSelectedDates}
                dateError={dateError}
                dateErrorText={dateErrorText}
                dict={dict}
              />
            )}

            {currStep === 2 && (
              <TimeSelectionStep
                dict={dict}
                delta={delta}
                timepickerIndex={timepickerIndex}
                setTimepickerIndex={setTimepickerIndex}
                mainFromTime={mainFromTime}
                mainToTime={mainToTime}
                setMainFromTime={setMainFromTime}
                setMainToTime={setMainToTime}
                dailyTimeRanges={dailyTimeRanges}
                dailyHours={dailyHours}
                handleDailyHourChange={handleDailyHourChange}
                pushSelectedTimecell={pushSelectedTimecell}
                popUnselectedTimecell={popUnselectedTimecell}
              />
            )}
          </div>
        </div>

        {createError && (
          <p
            role="alert"
            className="animate-in fade-in-0 slide-in-from-top-1 duration-300 text-center mt-3 text-sm text-red-600"
          >
            {createError}
          </p>
        )}

        <div className="self-center mt-12 flex items-center gap-6 justify-center">
          {currStep > 0 && (
            <button
              type="button"
              onClick={prev}
              className="px-6 py-3 font-semibold text-gray-700 hover:text-dark hover:bg-gray-100 active:bg-gray-200 rounded-2xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {dict.button.back}
            </button>
          )}
          <Button
            text={
              currStep === stepsInfo.length - 1
                ? dict.page.createMeeting.submitButton
                : dict.button.next
            }
            onClick={next}
            className="px-10"
          />
        </div>
      </div>
      {currStep === 0 && (
        <RecentMeetings lang={lang} t={dict.recentMeetings} className="mt-6" />
      )}
    </main>
  );
}
