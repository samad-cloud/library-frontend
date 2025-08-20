export type CalendarProvider = 'JIRA' | 'OUTLOOK' | 'GOOGLE' | 'MANUAL'
export type EventStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface ExternalIntegration {
  id: string
  user_id: string
  type: 'JIRA' | 'OUTLOOK' | 'GOOGLE'
  config: {
    domain: string
    username: string
    apiKey: string
    projectName?: string
    issueType?: string
  }
  last_synced: string | null
  created_at: string
  updated_at: string
}

export interface Calendar {
  id: string
  user_id: string
  provider: CalendarProvider
  name: string | null
  timezone: string | null
  config: Record<string, any> | null
  sync_token: string | null
  last_synced: string | null
  created_at: string
  updated_at: string
}

export interface CalendarEvent {
  id: string
  user_id: string
  calendar_id: string
  external_event_id: string
  summary: string | null
  description: string | null
  raw_data: Record<string, any> | null
  status: EventStatus
  processed_by: string | null
  due_date: string | null
  trigger_start: string | null
  trigger_end: string | null
  created_at: string
  fetched_at: string | null
  updated_at: string
  tags: string[]
  styles: string[]
  number_of_variations: number
  color: string
}

export interface CalendarEventWithCalendar extends CalendarEvent {
  calendars: {
    id: string
    name: string
    provider: CalendarProvider
  }
}
