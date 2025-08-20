import {
  areIntervalsOverlapping,
  endOfDay,
  parseISO,
  startOfDay,
} from "date-fns";
import { CalendarEvent } from "./types";

export function classNames(...arr: (string | false | null | undefined)[]) {
  return arr.filter(Boolean).join(" ");
}

export function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export function colorToBg(color?: string) {
  switch (color) {
    case "violet":
      return "bg-violet-500";
    case "emerald":
      return "bg-emerald-500";
    case "rose":
      return "bg-rose-500";
    case "amber":
      return "bg-amber-500";
    default:
      return "bg-sky-500";
  }
}

// Filter events for a specific date
export function eventsForDate(date: Date, events: CalendarEvent[]) {
  return events.filter((e) => areIntervalsOverlapping(
    { start: startOfDay(date), end: endOfDay(date) },
    { start: parseISO(e.start), end: parseISO(e.end) },
    { inclusive: true }
  ));
}
