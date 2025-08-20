import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { CalendarView } from "./types";
import { classNames } from "./utils";

interface CalendarHeaderProps {
  view: CalendarView;
  setView: (v: CalendarView) => void;
  cursor: Date;
  goPrev: () => void;
  goNext: () => void;
  goToday: () => void;
  onCreate?: () => void;
}

export function CalendarHeader({
  view,
  setView,
  cursor,
  goPrev,
  goNext,
  goToday,
  onCreate,
}: CalendarHeaderProps) {
  const title =
    view === "year"
      ? format(cursor, "yyyy")
      : view === "month"
      ? format(cursor, "MMMM yyyy")
      : view === "week"
      ? `${format(startOfWeek(cursor, { weekStartsOn: 1 }), "MMM d")} – ${format(endOfWeek(cursor, { weekStartsOn: 1 }), "MMM d, yyyy")}`
      : format(cursor, "EEEE, MMM d, yyyy");

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-2">
        <Button variant="outline" className="rounded-xl" onClick={goPrev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" className="rounded-xl" onClick={goNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="secondary" className="rounded-xl" onClick={goToday}>Today</Button>
        <div className="ml-3 text-2xl font-semibold tracking-tight">{title}</div>
      </div>

      <div className="flex items-center gap-2">
        <ViewSwitch value={view} onChange={setView} />
        {onCreate && (
          <Button className="rounded-2xl gap-2" onClick={onCreate}>
            <Plus className="h-4 w-4" /> Create Event
          </Button>
        )}
      </div>
    </div>
  );
}

function ViewSwitch({ value, onChange }: { value: CalendarView; onChange: (v: CalendarView) => void }) {
  return (
    <div className="grid grid-cols-4 rounded-2xl border bg-white p-1 shadow-sm">
      {(
        [
          { key: "day", label: "Day" },
          { key: "week", label: "Week" },
          { key: "month", label: "Month" },
          { key: "year", label: "Year" },
        ] as { key: CalendarView; label: string }[]
      ).map((opt) => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className={classNames(
            "px-3 py-2 text-sm font-medium rounded-xl transition",
            value === opt.key ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}