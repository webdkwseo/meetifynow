import Input from "@/components/Input";
import SlidingPill from "@/components/ui/SlidingPill";
import { features } from "@/lib/features";
import { fmt } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, X } from "lucide-react";
import React, { useState } from "react";
import { FieldErrors, UseFormRegister, UseFormSetValue } from "react-hook-form";

interface Inputs {
  meeting__name: string;
  meeting__place?: string;
  meeting__link?: string;
}

interface MeetingDetailsStepProps {
  delta: number;
  register: UseFormRegister<Inputs>;
  setValue: UseFormSetValue<Inputs>;
  errors: FieldErrors<Inputs>;
  dict: any;
  setMeetDetails: (details: any) => void;
  meetDetails: any;
  requiredParticipants: string[];
  setRequiredParticipants: (p: string[]) => void;
  workspaceMembers?: Array<{
    userId: string;
    displayName?: string | null;
    invitedEmail?: string | null;
    imageUrl?: string | null;
    role: string;
  }>;
  isPrivate?: boolean;
  setIsPrivate?: (v: boolean) => void;
  hasWorkspace?: boolean;
  durationMinutes: number;
  setDurationMinutes: (minutes: number) => void;
}

const DURATIONS = [30, 60, 90, 120];

const TEMPLATES = [
  { id: "kickoff", icon: "🚀" },
  { id: "status", icon: "📊" },
  { id: "review", icon: "🔍" },
  { id: "demo", icon: "✨" },
] as const;

const MeetingDetailsStep: React.FC<MeetingDetailsStepProps> = ({
  delta,
  register,
  setValue,
  errors,
  dict,
  setMeetDetails,
  meetDetails,
  requiredParticipants,
  setRequiredParticipants,
  workspaceMembers = [],
  isPrivate = false,
  setIsPrivate,
  hasWorkspace = false,
  durationMinutes,
  setDurationMinutes,
}) => {
  const t = dict.page.createMeeting;
  const [showAdvanced, setShowAdvanced] = useState(
    !!meetDetails.place || !!meetDetails.link,
  );
  const [participantInput, setParticipantInput] = useState("");

  const handleTemplateClick = (label: string) => {
    setValue("meeting__name", label, { shouldValidate: true });
    setMeetDetails({ ...meetDetails, name: label });
  };

  const addParticipant = () => {
    const trimmed = participantInput.trim();
    if (!trimmed || requiredParticipants.includes(trimmed)) return;
    setRequiredParticipants([...requiredParticipants, trimmed]);
    setParticipantInput("");
  };

  const removeParticipant = (name: string) =>
    setRequiredParticipants(requiredParticipants.filter((p) => p !== name));

  return (
    <motion.div
      initial={{ x: delta >= 0 ? "50%" : "-50%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="flex flex-col gap-6 w-full max-w-3xl mx-auto"
    >
      {features.nameTemplates && (
        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-medium text-gray-700 mb-3">
            {t.templates.label}
          </legend>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.id}
                type="button"
                onClick={() => handleTemplateClick(t.templates[tmpl.id])}
                className="flex items-center justify-center gap-2 px-3 py-3 border border-gray-200 rounded-xl hover:border-primary hover:bg-primary/5 transition-all active:scale-95 text-sm font-medium text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="text-base" aria-hidden>
                  {tmpl.icon}
                </span>
                {t.templates[tmpl.id]}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <Input
        label={t.input.meeting__name.label}
        name="meeting__name"
        type="text"
        id="meeting__name"
        register={register}
        errorText={errors.meeting__name?.message?.toString()}
        error={!!errors.meeting__name}
        placeholder={t.input.meeting__name.placeholder}
        onChange={(e) =>
          setMeetDetails({ ...meetDetails, name: e.target.value })
        }
        required={true}
      />

      <fieldset>
        <legend className="text-sm font-medium text-gray-700 mb-2">
          {t.duration.label}
        </legend>
        <div className="grid grid-cols-4 sm:inline-grid gap-1 p-1 bg-gray-100 rounded-2xl w-full sm:w-auto">
          {DURATIONS.map((minutes) => (
            <label
              key={minutes}
              className={`relative isolate cursor-pointer text-center whitespace-nowrap px-2 sm:px-4 py-2 rounded-xl text-sm font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary ${
                durationMinutes === minutes
                  ? "text-dark"
                  : "text-gray-600 hover:text-dark"
              }`}
            >
              {durationMinutes === minutes && (
                <SlidingPill layoutId="duration" />
              )}
              <input
                type="radio"
                name="meeting__duration"
                value={minutes}
                checked={durationMinutes === minutes}
                onChange={() => setDurationMinutes(minutes)}
                className="sr-only"
              />
              {t.duration.options[String(minutes)]}
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        aria-expanded={showAdvanced}
        aria-controls="meeting-advanced"
        className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors w-fit rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <ChevronDown
          size={16}
          className={`transition-transform duration-200 ${showAdvanced ? "rotate-180" : ""}`}
          aria-hidden
        />
        {t.advanced}
      </button>

      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            id="meeting-advanced"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex flex-col gap-6 overflow-hidden"
          >
            <Input
              label={t.input.meeting__place.label}
              name="meeting__place"
              type="text"
              id="meeting__place"
              register={register}
              errorText={errors.meeting__place?.message?.toString()}
              error={!!errors.meeting__place}
              placeholder={t.input.meeting__place.placeholder}
              onChange={(e) =>
                setMeetDetails({ ...meetDetails, place: e.target.value })
              }
            />
            <Input
              label={t.input.meeting__link.label}
              name="meeting__link"
              type="url"
              id="meeting__link"
              register={register}
              errorText={errors.meeting__link?.message?.toString()}
              error={!!errors.meeting__link}
              placeholder={t.input.meeting__link.placeholder}
              onChange={(e) =>
                setMeetDetails({ ...meetDetails, link: e.target.value })
              }
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Required participants */}
      {features.requiredParticipants && (
        <div className="flex flex-col gap-2">
          <label
            htmlFor="required-participant"
            className="text-sm font-medium text-gray-700"
          >
            {t.requiredParticipants.label}
            <span className="ml-1.5 text-xs font-normal text-gray-500">
              {t.requiredParticipants.optional}
            </span>
          </label>
          <p
            id="required-participant-hint"
            className="text-xs text-gray-500 -mt-1"
          >
            {t.requiredParticipants.hint}
          </p>

          {workspaceMembers.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs text-gray-600 font-medium">
                {t.requiredParticipants.fromTeam}
              </p>
              <div className="flex flex-wrap gap-2">
                {workspaceMembers.map((member) => {
                  const name =
                    member.displayName ?? member.invitedEmail ?? member.userId;
                  const isAdded = requiredParticipants.includes(name);
                  return (
                    <button
                      key={member.userId}
                      type="button"
                      aria-pressed={isAdded}
                      onClick={() =>
                        isAdded
                          ? removeParticipant(name)
                          : setRequiredParticipants([
                              ...requiredParticipants,
                              name,
                            ])
                      }
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        isAdded
                          ? "bg-dark text-white border-dark"
                          : "bg-white text-gray-700 border-gray-200 hover:border-dark hover:text-dark"
                      }`}
                    >
                      {member.imageUrl ? (
                        <img
                          src={member.imageUrl}
                          alt=""
                          className="w-4 h-4 rounded-full object-cover"
                        />
                      ) : (
                        <span
                          aria-hidden
                          className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-[9px] font-bold text-gray-600"
                        >
                          {name.charAt(0).toUpperCase()}
                        </span>
                      )}
                      {name}
                      {isAdded && (
                        <X size={10} className="ml-0.5" aria-hidden />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <input
              id="required-participant"
              type="text"
              value={participantInput}
              aria-describedby="required-participant-hint"
              onChange={(e) => setParticipantInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addParticipant();
                }
              }}
              placeholder={t.requiredParticipants.placeholder}
              maxLength={20}
              className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
            <button
              type="button"
              onClick={addParticipant}
              className="px-4 py-2 text-sm font-semibold bg-dark text-white rounded-lg hover:bg-dark/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {t.requiredParticipants.add}
            </button>
          </div>
          {requiredParticipants.length > 0 && (
            <ul className="flex flex-wrap gap-2 mt-1">
              {requiredParticipants.map((name) => (
                <li
                  key={name}
                  className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 bg-primary/10 text-dark text-xs font-medium rounded-full"
                >
                  {name}
                  <button
                    type="button"
                    onClick={() => removeParticipant(name)}
                    aria-label={fmt(t.requiredParticipants.remove, { name })}
                    className="p-1 rounded-full hover:text-red-600 hover:bg-white/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <X size={12} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {hasWorkspace && setIsPrivate && (
        <div className="flex items-center justify-between gap-4 py-3 px-4 bg-gray-50 rounded-xl border border-gray-200">
          <div>
            <p id="private-label" className="text-sm font-medium text-gray-700">
              {t.private.label}
            </p>
            <p id="private-hint" className="text-xs text-gray-600 mt-0.5">
              {t.private.hint}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isPrivate}
            aria-labelledby="private-label"
            aria-describedby="private-hint"
            onClick={() => setIsPrivate(!isPrivate)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
              isPrivate ? "bg-dark" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ease-[cubic-bezier(0.34,1.56,0.64,1)] duration-200 ${
                isPrivate ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default MeetingDetailsStep;
