import DetailedTimepicker from "@/components/CreateMeeting/DetailedTimepicker";
import SlidingPill from "@/components/ui/SlidingPill";
import Timepicker from "@/components/CreateMeeting/Timepicker";
import { generateShortDaysNames } from "@/utils/meeting/TimeFunctions";
import { motion } from "framer-motion";
import moment from "moment";
import React from "react";
import { DailyHours, DailyTimeRange } from "../../hooks/useCreateMeeting";

interface TimeSelectionStepProps {
  dict: any;
  delta: number;
  timepickerIndex: number;
  setTimepickerIndex: (index: number) => void;
  mainFromTime: number;
  mainToTime: number;
  setMainFromTime: (time: number) => void;
  setMainToTime: (time: number) => void;
  dailyTimeRanges: DailyTimeRange[];
  dailyHours: DailyHours;
  handleDailyHourChange: (
    date: number,
    type: "from" | "to",
    value: number,
  ) => void;
  pushSelectedTimecell: (dayDateTime: number, dateTime: number) => void;
  popUnselectedTimecell: (dayDateTime: number, dateTime: number) => void;
}

const TimeSelectionStep: React.FC<TimeSelectionStepProps> = ({
  dict,
  delta,
  timepickerIndex,
  setTimepickerIndex,
  mainFromTime,
  mainToTime,
  setMainFromTime,
  setMainToTime,
  dailyTimeRanges,
  dailyHours,
  handleDailyHourChange,
  pushSelectedTimecell,
  popUnselectedTimecell,
}) => {
  const t = dict.page.createMeeting;
  const shortDaysNames = generateShortDaysNames();
  const modes = [t.timeModes.same, t.timeModes.perDay, t.timeModes.manual];
  const descriptions = [
    t.step.three.description,
    t.timeModes.perDayDescription,
    t.timeModes.manualDescription,
  ];

  return (
    <motion.div
      initial={{ x: delta >= 0 ? "50%" : "-50%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <div className="flex flex-col items-center w-full mb-5">
        <div
          role="radiogroup"
          aria-label={t.timeModes.label}
          className="flex flex-col sm:flex-row w-full sm:w-auto gap-1 p-1 mb-4 bg-gray-100 rounded-2xl"
        >
          {modes.map((label, i) => (
            <button
              key={label}
              type="button"
              role="radio"
              aria-checked={timepickerIndex === i}
              onClick={() => setTimepickerIndex(i)}
              className={`relative isolate px-3 sm:px-4 py-2 rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                timepickerIndex === i
                  ? "text-dark"
                  : "text-gray-600 hover:text-dark"
              }`}
            >
              {timepickerIndex === i && <SlidingPill layoutId="time-mode" />}
              {label}
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-600 text-center max-w-md mb-4 px-2">
          {descriptions[timepickerIndex]}
        </p>
        <div
          className={`self-center overflow-y-auto h-[320px] w-full flex justify-center ${
            timepickerIndex !== 2 ? "p-2" : ""
          }`}
        >
          {timepickerIndex === 0 && (
            <div className="flex items-center justify-center gap-3 h-fit pt-6">
              <Timepicker
                from={true}
                label={t.timeModes.from}
                value={mainFromTime}
                onChange={(e) => {
                  const newFrom = +e.target.value;
                  setMainFromTime(newFrom);
                  if (newFrom >= mainToTime)
                    setMainToTime(Math.min(newFrom + 1, 24));
                }}
              />
              <span className="text-gray-400 font-medium" aria-hidden>
                –
              </span>
              <Timepicker
                from={false}
                label={t.timeModes.to}
                value={mainToTime}
                onChange={(e) => {
                  const newTo = +e.target.value;
                  setMainToTime(newTo);
                  if (newTo <= mainFromTime)
                    setMainFromTime(Math.max(newTo - 1, 0));
                }}
              />
            </div>
          )}
          {timepickerIndex === 1 && (
            <ul className="flex flex-col gap-3 mt-2 w-full max-w-[400px]">
              {dailyTimeRanges.map((dayTimeRange) => {
                const dateObj = moment(dayTimeRange.date);
                const dayLabel = dateObj.format("dddd, D MMMM");
                const { from, to } = dailyHours[dayTimeRange.date] || {
                  from: mainFromTime,
                  to: mainToTime,
                };
                return (
                  <li
                    key={dayTimeRange.date}
                    className="flex justify-between w-full items-center gap-3 px-3 sm:px-4 py-3 bg-white rounded-2xl border border-gray-200 shadow-sm"
                  >
                    <div
                      className="flex flex-col h-12 w-12 shrink-0 bg-primary/10 rounded-xl justify-center items-center"
                      aria-hidden
                    >
                      <p className="text-xl font-bold text-dark leading-none">
                        {dateObj.date()}
                      </p>
                      <p className="text-xs font-semibold text-dark/70 leading-none mt-1 uppercase">
                        {
                          shortDaysNames[
                            dateObj.day() === 0 ? 6 : dateObj.day() - 1
                          ]
                        }
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Timepicker
                        id={`from-${dayTimeRange.date}`}
                        from={true}
                        label={`${t.timeModes.from} – ${dayLabel}`}
                        value={from}
                        onChange={(e) =>
                          handleDailyHourChange(
                            dayTimeRange.date,
                            "from",
                            +e.target.value,
                          )
                        }
                      />
                      <span className="text-gray-400 font-medium" aria-hidden>
                        –
                      </span>
                      <Timepicker
                        id={`to-${dayTimeRange.date}`}
                        from={false}
                        label={`${t.timeModes.to} – ${dayLabel}`}
                        value={to}
                        onChange={(e) =>
                          handleDailyHourChange(
                            dayTimeRange.date,
                            "to",
                            +e.target.value,
                          )
                        }
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {timepickerIndex === 2 && (
            <div className="w-auto max-w-full md:max-w-[700px]">
              <DetailedTimepicker
                dates={dailyTimeRanges}
                pushSelectedTimecell={pushSelectedTimecell}
                popUnselectedTimecell={popUnselectedTimecell}
              />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default TimeSelectionStep;
