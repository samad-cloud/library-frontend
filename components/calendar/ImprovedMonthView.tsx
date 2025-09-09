import React, { useState, useCallback } from "react"
import {
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  isWeekend,
  parseISO,
  startOfMonth,
  startOfWeek,
  eachDayOfInterval,
  getWeek,
} from "date-fns"
import { CalendarEvent } from "./types"
import { cn } from "@/lib/utils"
import { Plus, MoreHorizontal, Lock, Timer, ImageIcon } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { motion, AnimatePresence } from "framer-motion"

interface ImprovedMonthViewProps {
  monthDate: Date
  events: CalendarEvent[]
  onSelectDate: (d: Date) => void
  onCreateEvent?: (date: Date) => void
  onEventClick?: (event: CalendarEvent) => void
  showWeekNumbers?: boolean
  compactMode?: boolean
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Get event status from database event or default
const getEventStatus = (event: CalendarEvent): string => {
  // @ts-ignore - databaseEvent might exist
  return event.databaseEvent?.status || event.status || 'default'
}

// Get color class based on status
const getStatusColorClass = (status: string) => {
  switch (status) {
    case 'pending':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'processing':
      return 'bg-violet-100 text-violet-800 border-violet-200'
    case 'completed':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    case 'failed':
      return 'bg-red-100 text-red-800 border-red-200'
    default:
      return 'bg-blue-100 text-blue-800 border-blue-200'
  }
}

// Get dot color based on status
const getStatusDotClass = (status: string) => {
  switch (status) {
    case 'pending':
      return 'bg-amber-500'
    case 'processing':
      return 'bg-violet-500'
    case 'completed':
      return 'bg-emerald-500'
    case 'failed':
      return 'bg-red-500'
    default:
      return 'bg-blue-500'
  }
}

export function ImprovedMonthView({
  monthDate,
  events,
  onSelectDate,
  onCreateEvent,
  onEventClick,
  showWeekNumbers = false,
  compactMode = false
}: ImprovedMonthViewProps) {
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null)
  const [expandedDate, setExpandedDate] = useState<Date | null>(null)
  
  const start = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 })
  const end = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start, end })

  const handleDayClick = useCallback((date: Date) => {
    if (expandedDate && isSameDay(date, expandedDate)) {
      setExpandedDate(null)
    } else {
      setExpandedDate(date)
      onSelectDate(date)
    }
  }, [expandedDate, onSelectDate])

  const handleDoubleClick = useCallback((date: Date) => {
    if (onCreateEvent) {
      onCreateEvent(date)
    }
  }, [onCreateEvent])

  // Group days by weeks for week numbers
  const weeks: Date[][] = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }

  return (
    <div className="calendar-container p-4">
      {/* Weekday headers */}
      <div className={cn(
        "grid gap-1 mb-2",
        showWeekNumbers ? "grid-cols-[auto_repeat(7,1fr)]" : "grid-cols-7"
      )}>
        {showWeekNumbers && <div className="w-8" />}
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-semibold uppercase tracking-wider text-gray-500 py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="space-y-1">
        {weeks.map((week, weekIndex) => {
          const weekNumber = getWeek(week[0], { weekStartsOn: 1 })
          
          return (
            <div
              key={weekIndex}
              className={cn(
                "grid gap-1",
                showWeekNumbers ? "grid-cols-[auto_repeat(7,1fr)]" : "grid-cols-7"
              )}
            >
              {showWeekNumbers && (
                <div className="w-8 flex items-start justify-center pt-2">
                  <span className="text-xs text-gray-400">{weekNumber}</span>
                </div>
              )}
              
              {week.map((day) => {
                const inMonth = isSameMonth(day, monthDate)
                const isWeekendDay = isWeekend(day)
                const isTodayDay = isToday(day)
                const dayEvents = events.filter((e) => isSameDay(parseISO(e.start), day))
                const isHovered = hoveredDate && isSameDay(day, hoveredDate)
                const isExpanded = expandedDate && isSameDay(day, expandedDate)

                return (
                  <motion.div
                    key={day.toISOString()}
                    layout
                    className={cn(
                      "relative group rounded-lg border transition-all duration-200",
                      inMonth ? "bg-white" : "bg-gray-50",
                      isWeekendDay && "bg-blue-50/30",
                      isTodayDay && "ring-2 ring-yellow-400 bg-yellow-50",
                      isHovered && "shadow-lg scale-[1.02] z-10",
                      isExpanded && "col-span-2 row-span-2 z-20",
                      "hover:shadow-md hover:border-gray-300",
                      compactMode ? "min-h-[80px]" : "min-h-[110px]",
                      "cursor-pointer"
                    )}
                    onMouseEnter={() => setHoveredDate(day)}
                    onMouseLeave={() => setHoveredDate(null)}
                    onClick={() => handleDayClick(day)}
                    onDoubleClick={() => handleDoubleClick(day)}
                  >
                    <div className="p-2">
                      {/* Day number and Today badge */}
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={cn(
                            "text-sm font-medium",
                            !inMonth && "text-gray-400",
                            isTodayDay && "text-yellow-700 font-bold"
                          )}
                        >
                          {format(day, "d")}
                        </span>
                        {isTodayDay && (
                          <span className="text-[10px] bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded-full font-medium">
                            Today
                          </span>
                        )}
                      </div>

                      {/* Events display */}
                      {!isExpanded && compactMode ? (
                        // Compact mode - show dots
                        <div className="flex gap-1 flex-wrap">
                          {dayEvents.slice(0, 5).map((event) => (
                            <TooltipProvider key={event.id}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    className={cn(
                                      "w-2 h-2 rounded-full transition-transform",
                                      getEventStatus(event) === 'processing' 
                                        ? "cursor-not-allowed opacity-75" 
                                        : "cursor-pointer hover:scale-125",
                                      getStatusDotClass(getEventStatus(event))
                                    )}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      if (getEventStatus(event) !== 'processing') {
                                        onEventClick?.(event)
                                      }
                                    }}
                                  />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="text-xs">
                                    <p className="font-medium">{event.title}</p>
                                    <p className="text-gray-500">
                                      {event.allDay ? "All day" : format(parseISO(event.start), "HH:mm")}
                                    </p>
                                    {getEventStatus(event) === 'processing' && (
                                      <p className="text-yellow-600 mt-1 flex items-center gap-1">
                                        <Timer className="w-3 h-3 animate-pulse" />
                                        Processing...
                                      </p>
                                    )}
                                    {event.images && event.images.length > 0 && (
                                      <p className="text-green-600 mt-1 flex items-center gap-1">
                                        <ImageIcon className="w-3 h-3" />
                                        {event.images.length} image{event.images.length > 1 ? 's' : ''} generated
                                      </p>
                                    )}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ))}
                          {dayEvents.length > 5 && (
                            <span className="text-[10px] text-gray-500">+{dayEvents.length - 5}</span>
                          )}
                        </div>
                      ) : (
                        // Normal/Expanded mode - show event pills
                        <div className="space-y-1">
                          <AnimatePresence>
                            {dayEvents.slice(0, isExpanded ? dayEvents.length : 3).map((event) => (
                              <motion.div
                                key={event.id}
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                className={cn(
                                  "text-xs px-2 py-1 rounded-md border truncate",
                                  getEventStatus(event) === 'processing' 
                                    ? "cursor-not-allowed opacity-90" 
                                    : "cursor-pointer hover:shadow-sm",
                                  "transition-all",
                                  getStatusColorClass(getEventStatus(event))
                                )}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (getEventStatus(event) !== 'processing') {
                                    onEventClick?.(event)
                                  }
                                }}
                                title={getEventStatus(event) === 'processing' ? 'This event is currently processing and cannot be edited' : ''}
                              >
                                <span className="flex items-center gap-1">
                                  {getEventStatus(event) === 'processing' && (
                                    <Timer className="w-3 h-3 animate-pulse" />
                                  )}
                                  {event.images && event.images.length > 0 && (
                                    <ImageIcon className="w-3 h-3 text-green-600" />
                                  )}
                                  <span className="font-medium">
                                    {event.allDay ? "•" : format(parseISO(event.start), "HH:mm")}
                                  </span>
                                  <span className="ml-1">{event.title}</span>
                                </span>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                          
                          {!isExpanded && dayEvents.length > 3 && (
                            <button
                              className="text-[11px] text-gray-500 hover:text-gray-700 flex items-center gap-1"
                              onClick={(e) => {
                                e.stopPropagation()
                                setExpandedDate(day)
                              }}
                            >
                              <MoreHorizontal className="w-3 h-3" />
                              {dayEvents.length - 3} more
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Quick add button on hover */}
                    {onCreateEvent && isHovered && !isExpanded && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="absolute top-1 right-1 p-1 bg-white rounded-md shadow-sm border hover:bg-gray-50"
                        onClick={(e) => {
                          e.stopPropagation()
                          onCreateEvent(day)
                        }}
                      >
                        <Plus className="w-3 h-3 text-gray-600" />
                      </motion.button>
                    )}
                  </motion.div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Month summary */}
      <div className="mt-4 pt-4 border-t flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <span>{events.length} events this month</span>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Pending</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-violet-500" />
              <span>Processing</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Completed</span>
            </div>
          </div>
        </div>
        {onCreateEvent && (
          <button
            className="text-blue-600 hover:text-blue-700 font-medium"
            onClick={() => onCreateEvent(new Date())}
          >
            Create Event
          </button>
        )}
      </div>
    </div>
  )
}