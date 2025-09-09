import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  add,
  addDays,
  addWeeks,
  addYears,
  addMonths,
  subMonths,
  subDays,
  subWeeks,
  subYears,
  endOfWeek,
  startOfWeek,
  eachDayOfInterval,
  set,
  startOfDay,
  endOfDay,
} from "date-fns";

import { CalendarHeader } from "./CalendarHeader";
import { ImprovedDayView } from "./ImprovedDayView";
import { WeekView } from "./WeekView";
import { MonthView } from "./MonthView";
import { YearView } from "./YearView";  
import { EnhancedCreateEventModal } from "./EnhancedCreateEventModal";
import { CalendarEvent, CalendarView } from "./types";
import { uid, eventsForDate } from "./utils";
import { createClient } from "@/utils/supabase/client";
import { UserPreferences } from "@/types/preferences";

interface EventCalendarAppProps {
  initialEvents?: CalendarEvent[]
  onCreateEvent?: (event: CalendarEvent) => void | Promise<void>
  onEventClick?: (event: CalendarEvent) => void
  showCreateButton?: boolean
}

export default function EventCalendarApp({ 
  initialEvents = [], 
  onCreateEvent,
  onEventClick,
  showCreateButton = true 
}: EventCalendarAppProps) {
  const [view, setView] = useState<CalendarView>("month"); // default to Month view
  const [cursor, setCursor] = useState<Date>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState<Date | null>(null);
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
  const supabase = createClient();

  // Load initial events
  useEffect(() => {
    if (initialEvents.length > 0) {
      setEvents(initialEvents)
    }
  }, [initialEvents])

  // Load user preferences for working hours
  useEffect(() => {
    loadUserPreferences();
  }, []);

  const loadUserPreferences = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error loading preferences:', error);
        return;
      }

      if (data) {
        setUserPreferences(data);
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  };

  const startOfWeekDate = useMemo(() => startOfWeek(cursor, { weekStartsOn: 1 }), [cursor]);
  const endOfWeekDate = useMemo(() => endOfWeek(cursor, { weekStartsOn: 1 }), [cursor]);

  const currentWeekDays = useMemo(
    () => eachDayOfInterval({ start: startOfWeekDate, end: endOfWeekDate }),
    [startOfWeekDate, endOfWeekDate]
  );

  // Nav handlers
  const goPrev = () => {
    if (view === "day") setCursor(subDays(cursor, 1));
    if (view === "week") setCursor(subWeeks(cursor, 1));
    if (view === "month") setCursor(subMonths(cursor, 1));
    if (view === "year") setCursor(subYears(cursor, 1));
  };
  const goNext = () => {
    if (view === "day") setCursor(addDays(cursor, 1));
    if (view === "week") setCursor(addWeeks(cursor, 1));
    if (view === "month") setCursor(addMonths(cursor, 1));
    if (view === "year") setCursor(addYears(cursor, 1));
  };
  const goToday = () => setCursor(new Date());

  async function createEvent(e: CalendarEvent) {
    const newEvent = { ...e, id: uid() }
    setEvents((prev) => [...prev, newEvent]);
    
    // Call external create handler if provided
    if (onCreateEvent) {
      try {
        await onCreateEvent(newEvent)
      } catch (error) {
        console.error('Error creating event:', error)
        // Optionally remove the event from local state if external creation fails
        setEvents((prev) => prev.filter(event => event.id !== newEvent.id))
      }
    }
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-white to-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <CalendarHeader
          view={view}
          setView={setView}
          cursor={cursor}
          goPrev={goPrev}
          goNext={goNext}
          goToday={goToday}
          onCreate={showCreateButton ? () => setModalOpen(true) : undefined}
        />

        <div className="rounded-2xl border bg-white shadow-sm">
          <AnimatePresence mode="wait">
            {view === "day" && (
              <motion.div
                key="day"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="p-4 md:p-6"
              >
                <ImprovedDayView 
                  date={cursor} 
                  events={eventsForDate(cursor, events)} 
                  onEventClick={onEventClick}
                  onCreateEvent={showCreateButton ? (time) => {
                    // Store the selected time and open the modal
                    setSelectedTime(time);
                    setModalOpen(true);
                  } : undefined}
                  userPreferences={userPreferences}
                />
              </motion.div>
            )}
            {view === "week" && (
              <motion.div
                key="week"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="p-2 md:p-4"
              >
                <WeekView 
                  days={currentWeekDays} 
                  events={events} 
                  onDayClick={(d) => { setCursor(d); setView("day"); }}
                  onEventClick={onEventClick}
                />
              </motion.div>
            )}
            {view === "month" && (
              <motion.div
                key="month"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="p-2 md:p-4"
              >
                <MonthView
                  monthDate={cursor}
                  events={events}
                  onSelectDate={(d) => { setCursor(d); setView("day"); }}
                />
              </motion.div>
            )}
            {view === "year" && (
              <motion.div
                key="year"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="p-4 md:p-6"
              >
                <YearView
                  yearDate={cursor}
                  events={events}
                  onSelectDate={(d) => { setCursor(d); setView("day"); }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <EnhancedCreateEventModal
          open={isModalOpen}
          onOpenChange={(open) => {
            setModalOpen(open);
            // Reset selected time when modal closes
            if (!open) {
              setSelectedTime(null);
            }
          }}
          onCreate={createEvent}
          baseDate={cursor}
          initialTime={selectedTime}
        />
      </div>
    </div>
  );
}