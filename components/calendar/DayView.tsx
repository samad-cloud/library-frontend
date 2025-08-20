import React, { useRef, useState, useEffect } from "react";
import { differenceInMinutes, format, parseISO, set, startOfDay } from "date-fns";
import { CalendarEvent, HOURS } from "./types";
import { classNames, colorToBg } from "./utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DayViewProps {
  date: Date;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
}

interface EventWithPosition extends CalendarEvent {
  column: number;
  totalColumns: number;
}

// Group overlapping events for better handling
function groupOverlappingEvents(events: CalendarEvent[]) {
  if (events.length === 0) return [];
  
  // Sort events by start time
  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.start).getTime() - new Date(b.start).getTime()
  );
  
  const eventGroups: CalendarEvent[][] = [];
  const processedEvents = new Set<string>();
  
  for (const event of sortedEvents) {
    if (processedEvents.has(event.id)) continue;
    
    const eventStart = new Date(event.start).getTime();
    const eventEnd = new Date(event.end).getTime();
    
    // Find all events that overlap with this event
    const overlappingEvents = sortedEvents.filter(otherEvent => {
      if (processedEvents.has(otherEvent.id)) return false;
      
      const otherStart = new Date(otherEvent.start).getTime();
      const otherEnd = new Date(otherEvent.end).getTime();
      
      // Events overlap if one starts before the other ends
      return (eventStart < otherEnd && eventEnd > otherStart);
    });
    
    // Mark all overlapping events as processed
    overlappingEvents.forEach(e => processedEvents.add(e.id));
    
    // Add this group to our groups array
    eventGroups.push(overlappingEvents);
  }
  
  return eventGroups;
}

export function DayView({ date, events, onEventClick }: DayViewProps) {
  const dayStart = startOfDay(date);

  // Separate all-day events and timed events
  const allDayEvents = events.filter((e) => e.allDay);
  const timedEvents = events.filter((e) => !e.allDay);
  
  // Group overlapping events
  const eventGroups = groupOverlappingEvents(timedEvents);

  return (
    <div className="space-y-4">
      {/* All-day row */}
      <div className="rounded-xl border bg-slate-50 p-3">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">All day</div>
        <div className="flex flex-wrap gap-2">
          {allDayEvents.length === 0 && (
            <div className="text-sm text-slate-500">No all‑day events</div>
          )}
          {allDayEvents.map((e) => (
            <span
              key={e.id}
              className={classNames(
                "inline-flex items-center gap-2 rounded-xl px-3 py-1 text-sm text-white cursor-pointer hover:shadow-lg transition-shadow",
                colorToBg(e.color)
              )}
              onClick={() => onEventClick?.(e)}
            >
              <span className={classNames("h-2 w-2 rounded-full", colorToBg(e.color))} />
              {e.title}
            </span>
          ))}
        </div>
      </div>

      {/* Hours grid */}
      <div className="grid grid-cols-[56px_1fr]">
        <div className="flex flex-col">
          {HOURS.map((h) => (
            <div key={h} className="h-14 border-b text-right pr-2 text-xs text-slate-500">
              {format(set(dayStart, { hours: h }), "ha")}
            </div>
          ))}
        </div>
        <div className="relative overflow-hidden">
          {HOURS.map((h) => (
            <div key={h} className="h-14 border-b" />
          ))}

          {/* Render event groups */}
          {eventGroups.map((eventGroup, groupIndex) => (
            <EventGroupContainer 
              key={`group-${groupIndex}`}
              events={eventGroup}
              dayStart={dayStart}
              onEventClick={onEventClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface EventGroupContainerProps {
  events: CalendarEvent[];
  dayStart: Date;
  onEventClick?: (event: CalendarEvent) => void;
}

function EventGroupContainer({ events, dayStart, onEventClick }: EventGroupContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [showScrollButtons, setShowScrollButtons] = useState(false);

  if (events.length === 0) return null;

  // Calculate the overall group bounds from all events
  const eventTimes = events.map(event => ({
    start: parseISO(event.start),
    end: parseISO(event.end)
  }));
  
  // Find the earliest start and latest end
  const groupStart = new Date(Math.min(...eventTimes.map(e => e.start.getTime())));
  const groupEnd = new Date(Math.max(...eventTimes.map(e => e.end.getTime())));
  
  const minutesFromStart = differenceInMinutes(groupStart, dayStart);
  const duration = Math.max(differenceInMinutes(groupEnd, groupStart), 30);

  const top = (minutesFromStart / (24 * 60)) * (24 * 56);
  const height = (duration / 60) * 56;
  


  // Check scroll state
  const checkScrollState = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth);
      setShowScrollButtons(scrollWidth > clientWidth);
    }
  };

  useEffect(() => {
    checkScrollState();
    const scrollContainer = scrollRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', checkScrollState);
      const resizeObserver = new ResizeObserver(checkScrollState);
      resizeObserver.observe(scrollContainer);
      
      return () => {
        scrollContainer.removeEventListener('scroll', checkScrollState);
        resizeObserver.disconnect();
      };
    }
  }, [events]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 190; // Slightly less than event width (180px + gap)
      const newScrollLeft = scrollRef.current.scrollLeft + (direction === 'right' ? scrollAmount : -scrollAmount);
      scrollRef.current.scrollTo({ left: newScrollLeft, behavior: 'smooth' });
    }
  };

  // If only one event, render it normally
  if (events.length === 1) {
    return (
      <TimedEventBlock 
        event={events[0]} 
        dayStart={dayStart} 
        onEventClick={onEventClick}
        style={{ top, height }}
      />
    );
  }

  // Multiple events - use scroll container
  return (
    <div 
      className="absolute group overflow-hidden"
      style={{ 
        top, 
        height, 
        left: '8px',
        width: 'calc(100% - 16px)'
      }}
    >
      {/* Scroll container */}
      <div 
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto h-full [&::-webkit-scrollbar]:hidden"
        style={{ 
          scrollbarWidth: 'none', 
          msOverflowStyle: 'none'
        }}
      >
        {events.map((event) => (
          <TimedEventBlock
            key={event.id}
            event={event}
            dayStart={dayStart}
            onEventClick={onEventClick}
            isInScrollContainer={true}
          />
        ))}
      </div>

      {/* Scroll indicators */}
      {showScrollButtons && (
        <>
          {canScrollLeft && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-6 p-0 bg-white/90 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => scroll('left')}
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
          )}
          {canScrollRight && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-0 top-1/2 -translate-y-1/2 h-6 w-6 p-0 bg-white/90 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => scroll('right')}
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          )}
        </>
      )}

      {/* Event count indicator for multiple events */}
      {events.length > 1 && (
        <div className="absolute top-1 right-1 bg-black/20 text-white text-xs px-1.5 py-0.5 rounded-full">
          {events.length}
        </div>
      )}
    </div>
  );
}

interface TimedEventBlockProps {
  event: CalendarEvent;
  dayStart: Date;
  onEventClick?: (event: CalendarEvent) => void;
  style?: React.CSSProperties;
  isInScrollContainer?: boolean;
}

function TimedEventBlock({ event, dayStart, onEventClick, style, isInScrollContainer = false }: TimedEventBlockProps) {
  const start = parseISO(event.start);
  const end = parseISO(event.end);

  // Calculate positioning only if not in scroll container
  let blockStyle: React.CSSProperties = style || {};
  
  if (!isInScrollContainer && !style) {
    const minutesFromStart = differenceInMinutes(start, dayStart);
    const duration = Math.max(differenceInMinutes(end, start), 30);
    const top = (minutesFromStart / (24 * 60)) * (24 * 56);
    const height = (duration / 60) * 56;
    
    // Debug logging for Back to School events
    if (event.title?.includes('Back to School')) {
      console.log('🐛 TimedEventBlock - Event:', event.title)
      console.log('🐛 Start time:', event.start, '→', start)
      console.log('🐛 End time:', event.end, '→', end)
      console.log('🐛 Day start:', dayStart)
      console.log('🐛 Minutes from start:', minutesFromStart)
      console.log('🐛 Duration (minutes):', duration)
      console.log('🐛 Top position:', top)
      console.log('🐛 Height:', height)
      console.log('🐛 AllDay:', event.allDay)
      console.log('🐛 ---')
    }
    
    blockStyle = {
      position: 'absolute',
      top,
      height,
      left: '8px',
      width: 'calc(100% - 16px)', // Use width instead of right
      maxWidth: 'calc(100% - 16px)', // Ensure it doesn't exceed container
      overflow: 'hidden' // Ensure content doesn't overflow
    };
  }

  // For scroll container, use constrained width
  if (isInScrollContainer) {
    blockStyle = {
      width: '180px', // Fixed width instead of minWidth
      maxWidth: '180px', // Ensure it doesn't grow
      height: '100%',
      flexShrink: 0
    };
  }

  return (
    <div
      className={classNames(
        "overflow-hidden rounded-xl p-2 text-xs text-white shadow-md cursor-pointer hover:shadow-lg transition-shadow",
        colorToBg(event.color),
        isInScrollContainer ? "relative" : "absolute"
      )}
      style={blockStyle}
      onClick={() => onEventClick?.(event)}
    >
      <div className={classNames(
        "flex items-start gap-1",
        isInScrollContainer ? "flex-col" : "justify-between"
      )}>
        <div className="font-semibold truncate flex-1 min-w-0">{event.title}</div>
        <div className={classNames(
          "opacity-80 text-xs whitespace-nowrap",
          isInScrollContainer ? "self-end" : ""
        )}>
          {format(start, "HH:mm")} – {format(end, "HH:mm")}
        </div>
      </div>
      {event.description && (
        <div className="mt-1 text-xs opacity-90 truncate">{event.description}</div>
      )}
    </div>
  );
}
