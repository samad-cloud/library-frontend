import React, { useState } from "react"
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
} from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { CalendarEvent } from "./types"
import { parseISO } from "date-fns"

interface MiniCalendarProps {
  selectedDate: Date
  onSelectDate: (date: Date) => void
  events?: CalendarEvent[]
  className?: string
}

export function MiniCalendar({
  selectedDate,
  onSelectDate,
  events = [],
  className
}: MiniCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(selectedDate)
  
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  
  // Check if a day has events
  const hasEvents = (date: Date) => {
    return events.some(event => 
      isSameDay(parseISO(event.start), date)
    )
  }
  
  // Get event count for a day
  const getEventCount = (date: Date) => {
    return events.filter(event => 
      isSameDay(parseISO(event.start), date)
    ).length
  }

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1))
  }

  const handleTodayClick = () => {
    const today = new Date()
    setCurrentMonth(today)
    onSelectDate(today)
  }

  return (
    <div className={cn("bg-white rounded-lg shadow-sm border p-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">
          {format(currentMonth, "MMMM yyyy")}
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrevMonth}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={handleTodayClick}
            className="px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            Today
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-0 mb-1">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
          <div
            key={index}
            className="text-center text-[10px] font-medium text-gray-400 py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0">
        {days.map((day) => {
          const isSelected = isSameDay(day, selectedDate)
          const isCurrentMonth = isSameMonth(day, currentMonth)
          const isTodayDate = isToday(day)
          const eventCount = getEventCount(day)
          const hasEventsOnDay = hasEvents(day)

          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelectDate(day)}
              className={cn(
                "relative aspect-square flex flex-col items-center justify-center rounded-md text-xs transition-all",
                "hover:bg-gray-100",
                isCurrentMonth ? "text-gray-900" : "text-gray-300",
                isSelected && "bg-blue-500 text-white hover:bg-blue-600",
                isTodayDate && !isSelected && "bg-yellow-100 text-yellow-800 font-bold",
                "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
              )}
              aria-label={`${format(day, "MMMM d, yyyy")}${eventCount > 0 ? `, ${eventCount} events` : ""}`}
            >
              <span>{format(day, "d")}</span>
              {hasEventsOnDay && (
                <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                  {eventCount <= 3 ? (
                    Array.from({ length: Math.min(eventCount, 3) }).map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "w-1 h-1 rounded-full",
                          isSelected ? "bg-white" : "bg-blue-500"
                        )}
                      />
                    ))
                  ) : (
                    <div
                      className={cn(
                        "w-2 h-1 rounded-full",
                        isSelected ? "bg-white" : "bg-blue-500"
                      )}
                    />
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Quick stats */}
      {events.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between text-[11px] text-gray-500">
            <span>{getEventCount(selectedDate)} events selected</span>
            <span>{events.length} total</span>
          </div>
        </div>
      )}
    </div>
  )
}