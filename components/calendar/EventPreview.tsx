'use client'

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"

interface Campaign {
  id: string
  name: string
  date: string
  description?: string
  issue_type?: string
  raw_data?: any
}

interface EventPreviewProps {
  events: Campaign[]
  visibleCount?: number
}

export default function EventPreview({ events, visibleCount = 2 }: EventPreviewProps) {
  const visibleEvents = events.slice(0, visibleCount)
  const remainingCount = events.length - visibleCount

  return (
    <div className="mt-1 space-y-1">
      {/* Visible events */}
      {visibleEvents.map((event) => (
        <div key={event.id} className="bg-gray-100 rounded p-2 text-xs">
          <div className="flex items-center gap-1 mb-1">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="font-medium text-gray-900 truncate">{event.name}</span>
          </div>
          {event.issue_type && (
            <div className="text-gray-500">{event.issue_type}</div>
          )}
          <div className="text-gray-500">via Jira</div>
        </div>
      ))}

      {/* Remaining events counter with hover preview */}
      {remainingCount > 0 && (
        <HoverCard>
          <HoverCardTrigger asChild>
            <div className="bg-gray-100 rounded p-2 text-xs cursor-pointer hover:bg-gray-200">
              <span className="text-gray-600 font-medium">+{remainingCount} more</span>
            </div>
          </HoverCardTrigger>
          <HoverCardContent className="w-80 p-2">
            <div className="space-y-2">
              {events.slice(visibleCount).map((event) => (
                <div key={event.id} className="border-b border-gray-100 last:border-0 pb-2 last:pb-0">
                  <div className="font-medium">{event.name}</div>
                  {event.issue_type && (
                    <div className="text-sm text-gray-500">{event.issue_type}</div>
                  )}
                  {/* {event.description && (
                    <div className="text-sm text-gray-500 line-clamp-2">{event.description}</div>
                  )} */}
                </div>
              ))}
            </div>
          </HoverCardContent>
        </HoverCard>
      )}
    </div>
  )
}