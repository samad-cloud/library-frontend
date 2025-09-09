import React, { useMemo } from "react"
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns"
import { CalendarEvent, HOURS } from "./types"
import { cn } from "@/lib/utils"
import { Plus, Clock } from "lucide-react"
import { UserPreferences } from "@/types/preferences"

interface ImprovedDayViewProps {
  date: Date
  events: CalendarEvent[]
  onEventClick?: (event: CalendarEvent) => void
  onCreateEvent?: (time: Date) => void
  userPreferences?: UserPreferences | null
}

// Convert time string (HH:MM) to hour number
const timeToHour = (time: string): number => {
  if (!time) return 9 // Default to 9 AM
  const [hours] = time.split(':').map(Number)
  return hours
}

// Check if hour is within working hours
const isWorkingHour = (hour: number, preferences?: UserPreferences | null): boolean => {
  if (!preferences?.highlight_working_hours) return false
  
  const startHour = timeToHour(preferences.working_hours_start || '09:00')
  const endHour = timeToHour(preferences.working_hours_end || '18:00')
  
  return hour >= startHour && hour < endHour
}

// Check if current day is a working day
const isWorkingDay = (date: Date, preferences?: UserPreferences | null): boolean => {
  if (!preferences?.highlight_working_hours) return true
  
  const dayOfWeek = date.getDay() // 0 = Sunday, 6 = Saturday
  const workingDays = preferences.working_days || [1, 2, 3, 4, 5] // Default Mon-Fri
  
  return workingDays.includes(dayOfWeek)
}

export function ImprovedDayView({ 
  date, 
  events, 
  onEventClick,
  onCreateEvent,
  userPreferences 
}: ImprovedDayViewProps) {
  // Sort events by start time
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => 
      new Date(a.start).getTime() - new Date(b.start).getTime()
    )
  }, [events])

  // Check if today is a working day
  const isToWorkingDay = isWorkingDay(date, userPreferences)
  const workingHoursStart = timeToHour(userPreferences?.working_hours_start || '09:00')
  const workingHoursEnd = timeToHour(userPreferences?.working_hours_end || '18:00')

  // Get events for each hour
  const getEventsForHour = (hour: number): CalendarEvent[] => {
    return sortedEvents.filter(event => {
      const eventStart = parseISO(event.start)
      const eventEnd = parseISO(event.end)
      const hourStart = new Date(date)
      hourStart.setHours(hour, 0, 0, 0)
      const hourEnd = new Date(date)
      hourEnd.setHours(hour, 59, 59, 999)
      
      // Check if event overlaps with this hour
      return (
        isWithinInterval(hourStart, { start: eventStart, end: eventEnd }) ||
        isWithinInterval(hourEnd, { start: eventStart, end: eventEnd }) ||
        isWithinInterval(eventStart, { start: hourStart, end: hourEnd }) ||
        isWithinInterval(eventEnd, { start: hourStart, end: hourEnd })
      )
    })
  }

  const handleTimeSlotClick = (hour: number) => {
    if (onCreateEvent) {
      const newEventTime = new Date(date)
      newEventTime.setHours(hour, 0, 0, 0)
      onCreateEvent(newEventTime)
    }
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="bg-white rounded-t-lg border-b px-4 py-3 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {format(date, "EEEE, MMMM d, yyyy")}
          </h3>
          {userPreferences?.highlight_working_hours && (
            <div className="flex items-center gap-2 mt-1">
              <Clock className="w-3 h-3 text-gray-500" />
              <p className="text-xs text-gray-500">
                {isToWorkingDay ? (
                  <>
                    Working hours: {userPreferences.working_hours_start?.substring(0, 5)} - {userPreferences.working_hours_end?.substring(0, 5)}
                    {userPreferences.timezone && ` (${userPreferences.timezone})`}
                  </>
                ) : (
                  'Non-working day'
                )}
              </p>
            </div>
          )}
        </div>
        <div className="text-sm text-gray-500">
          {sortedEvents.length} event{sortedEvents.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Time grid */}
      <div className="bg-white rounded-b-lg overflow-hidden">
        <div className="grid grid-cols-[60px_1fr] divide-x divide-gray-200">
          {/* Time labels column */}
          <div className="divide-y divide-gray-100">
            {HOURS.map((hour) => {
              const isWorking = isToWorkingDay && isWorkingHour(hour, userPreferences)
              return (
                <div
                  key={hour}
                  className={cn(
                    "h-16 px-2 py-1 text-xs font-medium text-right",
                    isWorking ? "bg-blue-50/50 text-gray-700" : "bg-gray-50/50 text-gray-400"
                  )}
                >
                  {format(new Date().setHours(hour, 0, 0, 0), "ha")}
                </div>
              )
            })}
          </div>

          {/* Events column */}
          <div className="divide-y divide-gray-100">
            {HOURS.map((hour) => {
              const hourEvents = getEventsForHour(hour)
              const isWorking = isToWorkingDay && isWorkingHour(hour, userPreferences)
              const isCurrentHour = new Date().getHours() === hour && 
                                    format(new Date(), "yyyy-MM-dd") === format(date, "yyyy-MM-dd")

              return (
                <div
                  key={hour}
                  className={cn(
                    "h-16 relative group cursor-pointer transition-all",
                    isWorking ? "bg-white hover:bg-blue-50/30" : "bg-gray-50/30 hover:bg-gray-100/30",
                    isCurrentHour && "ring-2 ring-inset ring-yellow-400 bg-yellow-50/20",
                    "border-l-4",
                    isWorking ? "border-l-blue-200" : "border-l-transparent"
                  )}
                  onClick={() => handleTimeSlotClick(hour)}
                >
                  {/* Current time indicator */}
                  {isCurrentHour && (
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-yellow-500 z-20">
                      <div className="absolute -left-1 -top-1 w-2 h-2 bg-yellow-500 rounded-full" />
                    </div>
                  )}

                  {/* Quick add button on hover */}
                  {onCreateEvent && (
                    <button
                      className={cn(
                        "absolute top-1 right-1 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10",
                        "bg-white shadow-sm border hover:bg-gray-50"
                      )}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleTimeSlotClick(hour)
                      }}
                    >
                      <Plus className="w-3 h-3 text-gray-600" />
                    </button>
                  )}

                  {/* Events for this hour */}
                  <div className="px-2 py-1 space-y-1">
                    {hourEvents.map((event) => {
                      const eventStart = parseISO(event.start)
                      const eventHour = eventStart.getHours()
                      const eventMinute = eventStart.getMinutes()
                      const isStartingThisHour = eventHour === hour

                      return (
                        <div
                          key={event.id}
                          className={cn(
                            "text-xs px-2 py-1 rounded cursor-pointer transition-all",
                            "hover:shadow-md hover:scale-[1.02]",
                            getEventColorClass(event),
                            !isStartingThisHour && "opacity-75"
                          )}
                          onClick={(e) => {
                            e.stopPropagation()
                            onEventClick?.(event)
                          }}
                          style={{
                            marginTop: isStartingThisHour ? `${(eventMinute / 60) * 3}rem` : 0
                          }}
                        >
                          <div className="flex items-center gap-1">
                            <span className="font-medium">
                              {format(eventStart, "h:mma")}
                            </span>
                            <span className="truncate">{event.title}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Working hours legend */}
      {userPreferences?.highlight_working_hours && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-white border border-gray-300 rounded" />
                <span className="text-gray-600">Working hours</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-50 border border-gray-200 rounded" />
                <span className="text-gray-500">Non-working hours</span>
              </div>
            </div>
            {!isToWorkingDay && (
              <span className="text-amber-600 font-medium">
                Non-working day
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Helper function to get event color class
function getEventColorClass(event: CalendarEvent): string {
  // @ts-ignore - databaseEvent might exist
  const status = event.databaseEvent?.status || event.status || 'default'
  
  switch (status) {
    case 'pending':
      return 'bg-amber-100 text-amber-800 border border-amber-200'
    case 'processing':
      return 'bg-violet-100 text-violet-800 border border-violet-200'
    case 'completed':
      return 'bg-emerald-100 text-emerald-800 border border-emerald-200'
    case 'failed':
      return 'bg-red-100 text-red-800 border border-red-200'
    default:
      return 'bg-blue-100 text-blue-800 border border-blue-200'
  }
}