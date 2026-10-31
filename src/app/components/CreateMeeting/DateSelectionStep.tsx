import { fmt } from "@/lib/utils";
import { generateShortDaysNames } from "@/utils/meeting/TimeFunctions";
import { motion } from "framer-motion";
import _ from "lodash";
import { ChevronLeft, ChevronRight } from "lucide-react";
import moment from "moment";
import React, { useState } from "react";

interface DateSelectionStepProps {
  delta: number;
  selectedDates: number[];
  setSelectedDates: (dates: number[]) => void;
  dateError: boolean;
  dateErrorText: string;
  dict: any;
}

/** Start on next month when fewer than 3 selectable days are left in this one. */
const initialMonth = () => {
  const today = moment();
  return today.daysInMonth() - today.date() + 1 < 3
    ? today.clone().add(1, "month")
    : today;
};

/** `count` working days (Mon–Fri) starting at `start`, as local midnights. */
const workdaysFrom = (start: moment.Moment, count: number) => {
  const days: number[] = [];
  const day = start.clone().startOf("day");
  while (days.length < count) {
    if (day.isoWeekday() <= 5) days.push(day.valueOf());
    day.add(1, "day");
  }
  return days;
};

const DateSelectionStep: React.FC<DateSelectionStepProps> = ({
  delta,
  selectedDates,
  setSelectedDates,
  dateError,
  dateErrorText,
  dict,
}) => {
  const t = dict.page.createMeeting.dates;
  const [month, setMonth] = useState(() => initialMonth().month());
  const [year, setYear] = useState(() => initialMonth().year());
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [selectionMode, setSelectionMode] = useState<boolean | null>(null);

  const toggleDate = (dateTime: number) => {
    setSelectedDates(
      selectedDates.includes(dateTime)
        ? selectedDates.filter((d) => d !== dateTime)
        : [...selectedDates, dateTime],
    );
  };

  const toggleTimecell = (dateTime: number) => {
    const isSelected = selectedDates.includes(dateTime);
    if (isMouseDown) {
      if (selectionMode === null) {
        setSelectionMode(!isSelected);
        toggleDate(dateTime);
      } else {
        if (selectionMode && !isSelected) {
          setSelectedDates([...selectedDates, dateTime]);
        } else if (!selectionMode && isSelected) {
          setSelectedDates(selectedDates.filter((d) => d !== dateTime));
        }
      }
    }
  };

  const handleMouseDown = (dateTime: number) => {
    setIsMouseDown(true);
    setSelectionMode(!selectedDates.includes(dateTime));
    toggleDate(dateTime);
  };

  const addDates = (dates: number[]) => {
    setSelectedDates(Array.from(new Set([...selectedDates, ...dates])));
    // Show the month the shortcut landed in.
    const first = moment(dates[0]);
    setMonth(first.month());
    setYear(first.year());
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);
    setSelectionMode(null);
  };

  const showCalendar = (m: number, y: number) => {
    var firstDay = new Date(y, m, 1).getDay();
    if (firstDay === 0) firstDay = 7;
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const weeksInMonth = Math.ceil((daysInMonth + firstDay - 1) / 7);
    let day = 1;
    let tableRows = [];

    for (let i = 0; i < weeksInMonth; i++) {
      let tableCells = [];
      for (let j = 0; j < 7; j++) {
        if ((i === 0 && j < firstDay - 1) || day > daysInMonth) {
          tableCells.push(<td key={`${i}-${j}`} className="h-12 w-12"></td>);
        } else {
          const date = moment().year(y).month(m).date(day);
          const dateTime = date.startOf("day").valueOf();
          const isPast = dateTime < moment().startOf("day").valueOf();
          const isToday = moment().isSame(date, "day");
          const isSelected = selectedDates.includes(dateTime);

          tableCells.push(
            <td key={dateTime} className="p-0">
              <button
                type="button"
                disabled={isPast}
                aria-pressed={isSelected}
                aria-label={date.format("dddd, D MMMM YYYY")}
                aria-current={isToday ? "date" : undefined}
                onMouseDown={() => handleMouseDown(dateTime)}
                onMouseEnter={() => toggleTimecell(dateTime)}
                // Keyboard activation (detail 0); mouse/touch handled by mousedown.
                onClick={(e) => e.detail === 0 && toggleDate(dateTime)}
                className={`h-11 w-full min-w-10 font-medium text-center transition-[background-color,color,border-color,transform] duration-200 active:scale-90 ${isSelected ? "animate-pop" : ""} border rounded-xl select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  isPast
                    ? "text-gray-400 border-transparent cursor-not-allowed"
                    : "cursor-pointer"
                } ${
                  isSelected
                    ? "bg-dark !text-white border-dark shadow-md shadow-dark/20 hover:bg-dark/90"
                    : isPast
                      ? ""
                      : "hover:bg-[#f0f6fa] text-dark border-transparent"
                } ${isToday && !isSelected ? "!border-dark/30 bg-gray-50" : ""}`}
              >
                {day}
              </button>
            </td>,
          );
          day++;
        }
      }
      tableRows.push(
        <tr key={i} onMouseUp={handleMouseUp}>
          {tableCells}
        </tr>,
      );
    }
    return tableRows;
  };

  const prevMonth = () =>
    month === 0 ? (setMonth(11), setYear(year - 1)) : setMonth(month - 1);
  const nextMonth = () =>
    month === 11 ? (setMonth(0), setYear(year + 1)) : setMonth(month + 1);
  const shortDaysNames = generateShortDaysNames();
  const isCurrentMonth = moment().month() === month && moment().year() === year;

  return (
    <motion.div
      initial={{ x: delta >= 0 ? "50%" : "-50%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="flex flex-col self-center items-center">
        <p className="text-sm text-gray-600 mb-3 text-center">{t.hint}</p>
        <div className="flex flex-wrap justify-center gap-2 mb-3">
          {[
            {
              label: t.quick.nextWorkdays,
              dates: () => workdaysFrom(moment(), 5),
            },
            {
              label: t.quick.nextWeek,
              dates: () =>
                workdaysFrom(moment().add(1, "week").startOf("isoWeek"), 5),
            },
          ].map(({ label, dates }) => (
            <button
              key={label}
              type="button"
              onClick={() => addDates(dates())}
              className="px-3 py-2 rounded-xl text-sm font-medium text-dark bg-white border border-gray-200 hover:border-dark/40 hover:bg-gray-50 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              + {label}
            </button>
          ))}
        </div>
        <div
          className={`p-3 sm:p-6 bg-white rounded-3xl border border-gray-200 shadow-sm transition-all duration-300 w-full max-w-sm ${
            dateError ? "ring-2 ring-red/50 shadow-red/10" : ""
          }`}
        >
          <table className="date__selection--table table-fixed border-separate border-spacing-1 mx-auto select-none w-full">
            <caption className="pb-2">
              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={prevMonth}
                  disabled={isCurrentMonth}
                  aria-label={t.prevMonth}
                  className="h-10 w-10 rounded-xl bg-white hover:bg-gray-50 active:bg-gray-100 border border-gray-200 shadow-sm transition-all duration-200 flex justify-center items-center text-dark disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <ChevronLeft className="w-4 h-4" aria-hidden />
                </button>
                <span
                  className="text-dark font-semibold text-lg"
                  aria-live="polite"
                >
                  {_.capitalize(
                    moment().year(year).month(month).format("MMMM"),
                  )}{" "}
                  {year}
                </span>
                <button
                  type="button"
                  onClick={nextMonth}
                  aria-label={t.nextMonth}
                  className="h-10 w-10 rounded-xl bg-white hover:bg-gray-50 active:bg-gray-100 border border-gray-200 shadow-sm transition-all duration-200 flex justify-center items-center text-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <ChevronRight className="w-4 h-4" aria-hidden />
                </button>
              </div>
            </caption>
            <thead>
              <tr>
                {shortDaysNames.map((day) => (
                  <th
                    key={day}
                    scope="col"
                    className="font-medium text-gray-500 text-sm"
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>{showCalendar(month, year)}</tbody>
          </table>
        </div>
        <p
          className={`text-sm mt-3 font-medium text-center ${
            selectedDates.length > 15 ? "text-red-600" : "text-gray-600"
          }`}
          aria-live="polite"
        >
          {fmt(t.selected, { count: selectedDates.length })}
        </p>
        <p
          role="alert"
          className="animate-in fade-in-0 slide-in-from-top-1 duration-300 text-sm mt-1 text-red-600 font-medium text-center"
        >
          {dateError && dateErrorText}
        </p>
      </div>
    </motion.div>
  );
};

export default DateSelectionStep;
