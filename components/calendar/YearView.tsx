import React from "react";
import {
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  startOfYear,
  eachDayOfInterval,
  eachMonthOfInterval,
} from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { CalendarEvent, DAYS } from "./types";
import { classNames, colorToBg } from "./utils";

interface YearViewProps {
  yearDate: Date;
  events: CalendarEvent[];
  onSelectDate: (d: Date) => void;
}

export function YearView({ yearDate, events, onSelectDate }: YearViewProps) {
  const months = eachMonthOfInterval({ start: startOfYear(yearDate), end: endOfYear(yearDate) });

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {months.map((monthDate) => (
        <div key={monthDate.toISOString()} className="rounded-2xl border p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-slate-500" />
              <div className="text-sm font-semibold">{format(monthDate, "MMMM yyyy")}</div>
            </div>
          </div>
          <MiniMonthGrid monthDate={monthDate} events={events} onSelectDate={onSelectDate} />
        </div>
      ))}
    </div>
  );
}

interface MiniMonthGridProps {
  monthDate: Date;
  events: CalendarEvent[];
  onSelectDate: (d: Date) => void;
}

function MiniMonthGrid({ monthDate, events, onSelectDate }: MiniMonthGridProps) {
  const start = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start, end });

  return (
    <div className="grid grid-cols-7 gap-1">
      {DAYS.map((d) => (
        <div key={d} className="py-1 text-center text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{d}</div>
      ))}
      {days.map((d) => {
        const inMonth = isSameMonth(d, monthDate);
        const dayEvents = events.filter((e) => isSameDay(parseISO(e.start), d));
        return (
          <button
            key={d.toISOString()}
            onClick={() => onSelectDate(d)}
            className={classNames(
              "relative h-10 rounded-lg p-1 text-xs transition",
              inMonth ? "bg-white hover:bg-slate-50" : "bg-slate-50 text-slate-400"
            )}
            title={format(d, "PPPP")}
          >
            <span className={classNames("absolute left-1 top-1 text-[10px]", isToday(d) && "font-bold")}>{format(d, "d")}</span>
            {/* Dots for events */}
            <div className="absolute bottom-1 left-1 right-1 flex gap-1">
              {dayEvents.slice(0, 4).map((e) => (
                <span key={e.id} className={classNames("h-1.5 w-1.5 rounded-full", colorToBg(e.color))} />
              ))}
              {dayEvents.length > 4 && (
                <span className="ml-auto text-[9px] text-slate-500">+{dayEvents.length - 4}</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
