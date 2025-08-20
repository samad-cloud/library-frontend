import React from "react";
import { format, isSameDay, isToday, parseISO, set, startOfDay } from "date-fns";
import { CalendarEvent, HOURS } from "./types";
import { classNames, colorToBg } from "./utils";

interface WeekViewProps {
  days: Date[];
  events: CalendarEvent[];
  onDayClick: (d: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
}

export function WeekView({ days, events, onDayClick, onEventClick }: WeekViewProps) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[900px]">
        {/* Header row with clickable day buttons */}
        <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b">
          <div />
          {days.map((d) => (
            <div key={d.toISOString()} className="px-2 py-3 text-center text-sm font-semibold">
              <button
                onClick={() => onDayClick(d)}
                className={classNames(
                  "mx-auto inline-flex min-w-[72px] items-center justify-center gap-2 rounded-xl px-3 py-1.5 relative z-10",
                  isToday(d) ? "bg-slate-900 text-white" : "hover:bg-slate-100"
                )}
              >
                <span className="text-slate-500">{format(d, "EEE")}</span>
                <span className="text-base">{format(d, "d")}</span>
              </button>
            </div>
          ))}
        </div>

        {/* All-day events row */}
        <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] bg-slate-50 border-b">
          <div className="px-2 py-2 text-xs font-semibold text-slate-500">ALL DAY</div>
          {days.map((d) => (
            <div key={d.toISOString()} className="px-2 py-2 min-h-[40px]">
              <div className="flex flex-wrap gap-1">
                {events
                  .filter((e) => e.allDay && isSameDay(parseISO(e.start), d))
                  .map((e) => (
                    <span 
                      key={e.id} 
                      className={classNames(
                        "rounded-md px-2 py-1 text-xs text-white cursor-pointer hover:shadow-lg transition-shadow", 
                        colorToBg(e.color)
                      )}
                      onClick={() => onEventClick?.(e)}
                    >
                      {e.title}
                    </span>
                  ))}
              </div>
            </div>
          ))}
        </div>

        {/* Main calendar grid */}
        <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))]">

          {/* Hours labels */}
          <div className="flex flex-col">
            {HOURS.map((h) => (
              <div key={h} className="h-14 border-b text-right pr-2 text-xs text-slate-500">
                {format(set(days[0], { hours: h }), "ha")}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((d) => (
            <div key={d.toISOString()} className="relative">
              {HOURS.map((h) => (
                <div key={h} className="h-14 border-b" />
              ))}
              {/* Timed events for each day - show first event + count */}
              <TimedEventsForDay 
                events={events.filter((e) => !e.allDay && isSameDay(parseISO(e.start), d))} 
                dayStart={startOfDay(d)}
                onEventClick={onEventClick}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface TimedEventsForDayProps {
  events: CalendarEvent[];
  dayStart: Date;
  onEventClick?: (event: CalendarEvent) => void;
}

function TimedEventsForDay({ events, dayStart, onEventClick }: TimedEventsForDayProps) {
  if (events.length === 0) return null;
  
  // Sort events by start time
  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.start).getTime() - new Date(b.start).getTime()
  );
  
  const processedEvents: { event: CalendarEvent; additionalCount: number }[] = [];
  const usedEventIds = new Set<string>();
  
  for (const event of sortedEvents) {
    if (usedEventIds.has(event.id)) continue;
    
    const eventStart = new Date(event.start).getTime();
    const eventEnd = new Date(event.end).getTime();
    
    // Find all overlapping events (including this one)
    const overlappingEvents = sortedEvents.filter(otherEvent => {
      const otherStart = new Date(otherEvent.start).getTime();
      const otherEnd = new Date(otherEvent.end).getTime();
      
      // Events overlap if one starts before the other ends
      return (eventStart < otherEnd && eventEnd > otherStart);
    });
    
    // Mark all overlapping events as used
    overlappingEvents.forEach(e => usedEventIds.add(e.id));
    
    // Show the first event with count of additional ones
    processedEvents.push({
      event: event,
      additionalCount: overlappingEvents.length - 1
    });
  }

  return (
    <>
      {processedEvents.map(({ event, additionalCount }) => (
        <TimedEventBlock 
          key={event.id} 
          event={event} 
          dayStart={dayStart}
          additionalCount={additionalCount}
          onEventClick={onEventClick}
        />
      ))}
    </>
  );
}

interface TimedEventBlockProps {
  event: CalendarEvent;
  dayStart: Date;
  additionalCount?: number;
  onEventClick?: (event: CalendarEvent) => void;
}

function TimedEventBlock({ event, dayStart, additionalCount = 0, onEventClick }: TimedEventBlockProps) {
  const start = parseISO(event.start);
  const end = parseISO(event.end);
  const minutesFromStart = Math.max(0, (start.getTime() - dayStart.getTime()) / (1000 * 60));
  const duration = Math.max((end.getTime() - start.getTime()) / (1000 * 60), 30); // min height

  const top = (minutesFromStart / (24 * 60)) * (24 * 56); // 56px per hour height (h-14)
  const height = (duration / 60) * 56;

  return (
    <div
      className={classNames(
        "absolute left-2 right-2 overflow-hidden rounded-xl p-2 text-xs text-white shadow-md cursor-pointer hover:shadow-lg transition-shadow",
        colorToBg(event.color)
      )}
      style={{ top, height }}
      onClick={() => onEventClick?.(event)}
    >
      <div className="flex items-center justify-between">
        <div className="font-semibold truncate">{event.title}</div>
        <div className="opacity-80">{format(start, "HH:mm")} – {format(end, "HH:mm")}</div>
      </div>
      {event.description && (
        <div className="mt-1 line-clamp-2 opacity-90">{event.description}</div>
      )}
      {additionalCount > 0 && (
        <div className="mt-1 text-xs opacity-75">
          +{additionalCount} more
        </div>
      )}
    </div>
  );
}
