import moment from "moment";
import { useEffect, useRef, useState } from "react";
import { generateShortDaysNames } from "../../utils/meeting/TimeFunctions";

type DayTimesData = {
  date: number;
  times: number[];
};

export default function DetailedTimepicker(props: {
  dates: Array<DayTimesData>;
  pushSelectedTimecell: (dayDatetime: number, dateTime: number) => void;
  popUnselectedTimecell: (dayDatetime: number, dateTime: number) => void;
}) {
  const getPickedTimes = () => {
    return props.dates.flatMap((dateInfo: DayTimesData) => dateInfo.times);
  };

  const [selectedTimecells, setSelectedTimecells] =
    useState<number[]>(getPickedTimes());
  const [selectionMode, setSelectionMode] = useState(false);
  const [unselectMode, setUnselectMode] = useState(false);

  // Scroll the grid to the first selected half-hour instead of 00:00.
  const tableRef = useRef<HTMLTableElement>(null);
  useEffect(() => {
    const first = tableRef.current?.querySelector<HTMLElement>(
      '[aria-pressed="true"]',
    );
    const scroller = tableRef.current?.closest<HTMLElement>(".overflow-y-auto");
    if (first && scroller) {
      scroller.scrollTop +=
        first.getBoundingClientRect().top -
        scroller.getBoundingClientRect().top -
        48;
    }
  }, []);

  const [windowWidth, setWindowWidth] = useState(1024);
  useEffect(() => {
    setWindowWidth(window.innerWidth);
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [isMouseDown, setIsMouseDown] = useState(false);
  useEffect(() => {
    const handleMouseDown = () => setIsMouseDown(true);
    const handleMouseUp = () => setIsMouseDown(false);
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const isMobile = () => windowWidth < 1024;

  const isDateSelected = (dateTime: number) =>
    selectedTimecells.some((t) => t === dateTime);

  const unselectTimecell = (dateTime: number) => {
    if (!isMobile()) setUnselectMode(true);
    setSelectedTimecells((prev) => prev.filter((t) => t !== dateTime));
  };

  const toggleTimecell = (dayDatetime: number, dateTime: number) => {
    if (isDateSelected(dateTime)) {
      if (!selectionMode) {
        unselectTimecell(dateTime);
        props.popUnselectedTimecell(dayDatetime, dateTime);
      }
      if (selectionMode && unselectMode) {
        unselectTimecell(dateTime);
        props.popUnselectedTimecell(dayDatetime, dateTime);
      }
    } else {
      if (!unselectMode) {
        setSelectedTimecells((prev) => [...prev, dateTime]);
        props.pushSelectedTimecell(dayDatetime, dateTime);
      }
    }
  };

  const disableSelection = () => {
    if (!isMouseDown) {
      setSelectionMode(false);
      setUnselectMode(false);
    }
  };

  const handleMouseOver = (dayDatetime: number, dateTime: number) => {
    if (selectionMode) toggleTimecell(dayDatetime, dateTime);
  };

  const dates = props.dates;
  const days = dates.map((dateInfo: DayTimesData) => moment(dateInfo.date));

  const renderTimeCells = () => {
    const timeCells: any[] = [];

    for (let i = 0; i <= 23; i++) {
      for (let h = 0; h < 2; h++) {
        const timeRow = [];
        for (let j = 0; j < days.length; j++) {
          const dayDatetime = props.dates[j].date;
          const dateTime = days[j]
            .hour(i)
            .minute(h === 0 ? 0 : 30)
            .valueOf();
          const isEndOfWeek = moment(dateTime).day() === 0;

          timeRow.push(
            <td key={dateTime}>
              <button
                type="button"
                data-date={dateTime}
                aria-pressed={isDateSelected(dateTime)}
                aria-label={moment(dateTime).format("dddd D MMMM, HH:mm")}
                // Keyboard activation (detail 0); mouse/touch handled by mousedown.
                onClick={(e) => {
                  if (e.detail !== 0) return;
                  toggleTimecell(dayDatetime, dateTime);
                  setUnselectMode(false);
                }}
                onMouseDown={() => {
                  toggleTimecell(dayDatetime, dateTime);
                  if (!isMobile()) setSelectionMode(true);
                }}
                onMouseUp={() => {
                  if (!isMobile()) {
                    setSelectionMode(false);
                    setUnselectMode(false);
                  }
                }}
                onMouseOver={() => {
                  if (!isMobile()) {
                    handleMouseOver(dayDatetime, dateTime);
                    disableSelection();
                  }
                }}
                className={`block rounded-lg h-10 w-16 sm:w-20 lg:h-6 lg:w-12 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark focus-visible:ring-offset-1 ${
                  isEndOfWeek ? "mr-4" : ""
                } ${
                  isDateSelected(dateTime)
                    ? `bg-primary ${!isMobile() ? "hover:bg-primary/50" : ""}`
                    : `border border-gray ${!isMobile() ? "hover:border-none hover:bg-gray" : ""}`
                }`}
              />
            </td>,
          );
        }

        if (h === 0) {
          timeCells.push(
            <tr key={i + "00"} className="cursor-pointer">
              <th
                rowSpan={2}
                className="text-right text-dark align-top bg-white sticky left-0 pr-2"
              >
                {i.toString().padStart(2, "0")}:00
              </th>
              {timeRow}
            </tr>,
          );
        } else {
          timeCells.push(
            <tr key={i + "30"} className="cursor-pointer">
              {timeRow}
            </tr>,
          );
        }
      }
    }

    timeCells.push(
      <tr key="2400" className="cursor-pointer">
        <th className="text-right text-dark align-bottom bg-white sticky left-0 pr-2">
          24:00
        </th>
      </tr>,
    );

    return timeCells;
  };

  const daysNaming = generateShortDaysNames();

  const renderDaysHeadings = () =>
    days.map((day: any) => (
      <th
        key={moment(day).date()}
        className={`bg-white sticky top-0 z-10 ${moment(day).day() === 0 ? "pr-4" : ""}`}
      >
        <p className="text-sm text-dark font-medium">
          {moment(day).date().toString().padStart(2, "0") +
            "." +
            (moment(day).month() + 1).toString().padStart(2, "0")}
        </p>
        <p className="text-dark">
          {daysNaming[moment(day).day() === 0 ? 6 : moment(day).day() - 1]}
        </p>
      </th>
    ));

  return (
    <table
      ref={tableRef}
      className="time__seclection--table w-fit self-center select-none"
    >
      <thead>
        <tr>
          <th className="bg-white sticky top-0 left-0 z-20" />
          {renderDaysHeadings()}
        </tr>
      </thead>
      <tbody>{renderTimeCells()}</tbody>
    </table>
  );
}
