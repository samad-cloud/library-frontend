import React from "react";
import {
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  eachDayOfInterval,
} from "date-fns";
import { CalendarEvent, DAYS } from "./types";
import { classNames, colorToBg } from "./utils";

interface MonthViewProps {
  monthDate: Date;
  events: CalendarEvent[];
  onSelectDate: (d: Date) => void;
}

export function MonthView({ monthDate, events, onSelectDate }: MonthViewProps) {
  const start = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start, end });

  return (
    <div className="p-2">
      <div className="grid grid-cols-7 gap-2">
        {DAYS.map((d) => (
          <div key={d} className="px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
            {d}
          </div>
        ))}
        {days.map((d) => {
          const inMonth = isSameMonth(d, monthDate);
          const dayEvents = events.filter((e) => isSameDay(parseISO(e.start), d));
          return (
            <button
              key={d.toISOString()}
              onClick={() => onSelectDate(d)}
              className={classNames(
                "group relative min-h-[92px] rounded-xl border p-2 text-left transition",
                inMonth ? "bg-white hover:bg-slate-50" : "bg-slate-50 text-slate-400"
              )}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className={classNames("text-xs", isToday(d) && "font-semibold")}>{format(d, "d")}</span>
                {isToday(d) && <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-slate-900 text-white">Today</span>}
              </div>

              {/* Up to 3 events preview */}
              <div className="flex flex-col gap-1">
                {dayEvents.slice(0, 3).map((e) => (
                  <div key={e.id} className={classNames("truncate rounded-md px-2 py-1 text-[11px] text-white", colorToBg(e.color))}>
                    <span className="opacity-90 mr-1">
                      {e.allDay ? "All day" : `${format(parseISO(e.start), "HH:mm")}`}
                    </span>
                    {e.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[11px] text-slate-500">+{dayEvents.length - 3} more</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
