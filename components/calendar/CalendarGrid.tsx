'use client'

import EventPreview from './EventPreview'

interface Campaign {
  id: string
  name: string
  date: string
  description?: string
  issue_type?: string
  raw_data?: any
}

interface CalendarGridProps {
  currentDate: Date
  existingCampaigns: Campaign[]
  openCampaignModal: (date: Date) => void
  isLoading?: boolean
}

export default function CalendarGrid({ currentDate, existingCampaigns, openCampaignModal, isLoading = false }: CalendarGridProps) {
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())

    const days = []
    const current = new Date(startDate)

    // Generate 6 weeks of days
    for (let week = 0; week < 6; week++) {
      for (let day = 0; day < 7; day++) {
        days.push(new Date(current))
        current.setDate(current.getDate() + 1)
      }
    }

    return days
  }

  const calendarDays = generateCalendarDays()

  return (
    <div className="bg-white relative">
      {isLoading && (
        <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      )}
      
      {/* Days of week header */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {daysOfWeek.map((day) => (
          <div
            key={day}
            className="p-4 text-center text-sm font-medium text-gray-500 border-r border-gray-200 last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar days */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, index) => {
          const isCurrentMonth = day.getMonth() === currentDate.getMonth()
          const dayNumber = day.getDate()
          const dateString = day.toISOString().split("T")[0]
          const dayEvents = existingCampaigns.filter((campaign) => campaign.date === dateString)
          const hasEvents = dayEvents.length > 0 && isCurrentMonth

          return (
            <div
              key={index}
              className="min-h-24 p-2 border-r border-b border-gray-200 last:border-r-0 relative cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => openCampaignModal(day)}
            >
              <span className={`text-sm ${isCurrentMonth ? "text-gray-900" : "text-gray-400"}`}>
                {dayNumber}
              </span>

              {hasEvents && (
                <EventPreview events={dayEvents} visibleCount={1} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}