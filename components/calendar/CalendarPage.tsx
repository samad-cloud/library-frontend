'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import Calendar from './Calendar'
import { CalendarEvent as CalendarEventType } from './types'
import { EnhancedEventDetailsModal } from './EnhancedEventDetailsModal'
import { EnhancedEditEventModal } from './EnhancedEditEventModal'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RefreshCw, Trash2, ChevronDown, Calendar as CalendarIcon } from 'lucide-react'

interface DatabaseEvent {
  id: string
  user_id: string
  calendar_id: string
  external_event_id: string
  summary: string
  description: string | null
  raw_data: any
  status: 'pending' | 'processing' | 'completed' | 'failed'
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
  calendars: {
    id: string
    name: string
    provider: string
  }
}

interface CalendarPageProps {
  isAuthenticated: boolean
}

// Helper function to get event color based on status and provider
const getEventColor = (status: string, provider?: string): string => {
  switch (status) {
    case 'pending':
      return 'amber'
    case 'processing': 
      return 'violet'
    case 'completed':
      return 'emerald'
    case 'failed':
      return 'red'
    default:
      return provider === 'JIRA' ? 'amber' : 'sky'
  }
}

export default function CalendarPage({ isAuthenticated }: CalendarPageProps) {
  const [events, setEvents] = useState<CalendarEventType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventType | null>(null)
  const [eventDetailsOpen, setEventDetailsOpen] = useState(false)
  const [editEvent, setEditEvent] = useState<CalendarEventType | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [hasJiraIntegration, setHasJiraIntegration] = useState(false)
  const [isCleaningDuplicates, setIsCleaningDuplicates] = useState(false)
  const [isForceSync, setIsForceSync] = useState(false)
  const [visibleCalendars, setVisibleCalendars] = useState<string[]>([])
  const [filteredEvents, setFilteredEvents] = useState<CalendarEventType[]>([])
  const [availableCalendars, setAvailableCalendars] = useState<any[]>([])
  const [loadingCalendars, setLoadingCalendars] = useState(true)
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(null)
  const supabase = createClient()

  // Handle event click
  const handleEventClick = (event: CalendarEventType) => {
    setSelectedEvent(event)
    setEventDetailsOpen(true)
  }

  // Handle edit event
  const handleEditEvent = (event: CalendarEventType) => {
    setEditEvent(event)
    setEditModalOpen(true)
  }

  // Handle calendar visibility toggle
  const handleCalendarToggle = (calendarId: string, visible: boolean) => {
    setVisibleCalendars(prev => {
      if (visible) {
        return [...prev, calendarId]
      } else {
        return prev.filter(id => id !== calendarId)
      }
    })
  }

  // Update event function
  const updateEvent = async (eventId: string, updatedEvent: CalendarEventType) => {
    try {
      console.log('Updating event with data:', updatedEvent)
      
      // Prepare data for API
      const eventData = {
        title: updatedEvent.title,
        description: updatedEvent.description,
        dueDate: updatedEvent.databaseEvent?.due_date,
        triggerStart: updatedEvent.databaseEvent?.trigger_start || updatedEvent.start,
        triggerEnd: updatedEvent.databaseEvent?.trigger_end || updatedEvent.end,
        color: updatedEvent.color,
        allDay: updatedEvent.allDay,
        styles: updatedEvent.styles || [],
        numberOfVariations: updatedEvent.number_of_variations || 1,
        originalRawData: updatedEvent.databaseEvent?.raw_data
      }

      const response = await fetch('/api/events', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ eventId, eventData })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.details || result.error || 'Failed to update event')
      }

      console.log('✅ Event updated successfully:', result.event)
      
      // Determine if it's an all-day event
      const isAllDay = result.event.raw_data?.all_day === true || 
        (result.event.trigger_start?.includes('T00:00:00') && 
         result.event.trigger_end?.includes('T23:59:59'))
      
      // Update the event in local state
      const updatedCalendarEvent: CalendarEventType = {
        id: result.event.id,
        title: result.event.summary,
        description: result.event.description || '',
        start: result.event.trigger_start,
        end: result.event.trigger_end,
        color: result.event.color,
        allDay: isAllDay,
        databaseEvent: result.event
      }
      
      setEvents(prev => prev.map(event => 
        event.id === eventId ? updatedCalendarEvent : event
      ))
      
      return result.event

    } catch (error) {
      console.error('❌ Error updating event:', error)
      throw error // Re-throw so the modal can handle it
    }
  }

  // Check for Jira integration
  const checkJiraIntegration = async () => {
    if (!isAuthenticated) return

    try {
      const { data, error } = await supabase
        .from('external_integrations')
        .select('*')
        .eq('type', 'JIRA')
        .single()

      if (!error && data) {
        setHasJiraIntegration(true)
      }
    } catch (err) {
      console.error('Error checking Jira integration:', err)
    }
  }

  // Load events from database
  const loadEvents = async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      // Build URL with calendar filter if selected
      let url = '/api/events'
      if (selectedCalendarId) {
        url += `?calendar_id=${selectedCalendarId}`
      }
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error('Failed to fetch events')
      }

      const { events: dbEvents } = await response.json()
      
      // Convert database events to calendar event format
      const calendarEvents: CalendarEventType[] = dbEvents.map((event: DatabaseEvent) => {
        const start = event.trigger_start || new Date().toISOString()
        const end = event.trigger_end || new Date(Date.now() + 60 * 60 * 1000).toISOString()
        
        // Determine if it's an all-day event
        const isAllDay = event.raw_data?.all_day === true || 
          (start.includes('T00:00:00') && end.includes('T23:59:59'))
        

        
        return {
          id: event.id,
          title: event.summary,
          description: event.description || '',
          start,
          end,
          color: event.color || getEventColor(event.status, event.calendars.provider),
          allDay: isAllDay,
          // Add database event data for the modal
          databaseEvent: event,
          // Add images data
          images: event.images || []
        }
      })

      setEvents(calendarEvents)
      
      // Initialize visible calendars if not set
      if (visibleCalendars.length === 0 && dbEvents.length > 0) {
        const uniqueCalendarIds: string[] = [...new Set(dbEvents.map((e: DatabaseEvent) => e.calendar_id))]
        setVisibleCalendars(uniqueCalendarIds)
      }
    } catch (err) {
      console.error('Error loading events:', err)
      setError('Failed to load calendar events')
    } finally {
      setLoading(false)
    }
  }

  // Filter events based on selected calendar
  useEffect(() => {
    if (!selectedCalendarId) {
      // If no calendar selected, show events from visible calendars
      if (visibleCalendars.length === 0) {
        setFilteredEvents(events)
      } else {
        const filtered = events.filter(event => {
          if (event.databaseEvent && 'calendar_id' in event.databaseEvent) {
            return visibleCalendars.includes(event.databaseEvent.calendar_id)
          }
          return true
        })
        setFilteredEvents(filtered)
      }
    } else {
      // Show only events from the selected calendar
      const filtered = events.filter(event => {
        if (event.databaseEvent && 'calendar_id' in event.databaseEvent) {
          return event.databaseEvent.calendar_id === selectedCalendarId
        }
        return false
      })
      setFilteredEvents(filtered)
    }
  }, [events, selectedCalendarId, visibleCalendars])

  // Sync events from Jira
  const syncJiraEvents = async (forceFullSync = false) => {
    if (!isAuthenticated || !hasJiraIntegration) return

    try {
      setIsSyncing(true)
      setSyncStatus(null)

      // Get Jira integration details
      const { data: integration, error: integrationError } = await supabase
        .from('external_integrations')
        .select('*')
        .eq('type', 'JIRA')
        .single()

      if (integrationError || !integration) {
        throw new Error('Jira integration not found')
      }

      // Call the sync API with stored credentials
      const response = await fetch('/api/connect-jira', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: forceFullSync ? 'connect' : 'sync', // Use 'connect' to force full sync
          credentials: {
            jiraUrl: integration.config.domain,
            username: integration.config.username,
            apiToken: integration.config.apiKey,
            projectName: integration.config.projectName,
            issueType: integration.config.issueType
          }
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Sync failed')
      }

      // Show success message with sync strategy info
      const strategyEmoji = result.sync_strategy === 'incremental' ? '⚡' : '🔄'
      setSyncStatus(`${strategyEmoji} ${result.message || `Sync completed! ${result.newly_inserted} new events added, ${result.skipped_existing} existing events skipped.`}`)
      
      // Auto-dismiss success message after 5 seconds
      setTimeout(() => setSyncStatus(null), 5000)
      
      // Reload events to show the updated list
      await loadEvents()
    } catch (err) {
      console.error('Error syncing events:', err)
      setSyncStatus(`❌ Sync failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
      
      // Auto-dismiss error message after 8 seconds
      setTimeout(() => setSyncStatus(null), 8000)
    } finally {
      setIsSyncing(false)
    }
  }

  // Clean up duplicate events
  const cleanupDuplicates = async () => {
    if (!isAuthenticated) return

    try {
      setIsCleaningDuplicates(true)
      setSyncStatus(null)

      // Find duplicate events (same external_event_id for same user)
      const { data: allEvents, error: fetchError } = await supabase
        .from('calendar_events')
        .select('id, external_event_id, created_at')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .order('external_event_id')
        .order('created_at')

      if (fetchError) {
        throw new Error('Failed to fetch events')
      }

      // Group by external_event_id and find duplicates
      const eventGroups: { [key: string]: typeof allEvents } = {}
      allEvents.forEach(event => {
        if (!eventGroups[event.external_event_id]) {
          eventGroups[event.external_event_id] = []
        }
        eventGroups[event.external_event_id].push(event)
      })

      // Find events to delete (keep oldest, delete newer duplicates)
      const eventsToDelete: string[] = []
      Object.values(eventGroups).forEach(group => {
        if (group.length > 1) {
          // Keep the first (oldest) and delete the rest
          const duplicates = group.slice(1)
          eventsToDelete.push(...duplicates.map(e => e.id))
        }
      })

      if (eventsToDelete.length === 0) {
        setSyncStatus('✅ No duplicate events found!')
        setTimeout(() => setSyncStatus(null), 3000)
        return
      }

      // Delete duplicates
      const { error: deleteError } = await supabase
        .from('calendar_events')
        .delete()
        .in('id', eventsToDelete)

      if (deleteError) {
        throw new Error('Failed to delete duplicate events')
      }

      setSyncStatus(`✅ Cleaned up ${eventsToDelete.length} duplicate events!`)
      setTimeout(() => setSyncStatus(null), 5000)

      // Reload events
      await loadEvents()
    } catch (err) {
      console.error('Error cleaning duplicates:', err)
      setSyncStatus(`❌ Cleanup failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
      setTimeout(() => setSyncStatus(null), 8000)
    } finally {
      setIsCleaningDuplicates(false)
    }
  }


  // Update event status
  const updateEventStatus = async (eventId: string, status: string) => {
    try {
      const response = await fetch('/api/calendar-events', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: eventId,
          status,
          processed_by: 'user'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update event')
      }

      // Reload events to reflect changes
      await loadEvents()
    } catch (err) {
      console.error('Error updating event:', err)
    }
  }

  // Load available calendars
  const loadCalendars = async () => {
    try {
      setLoadingCalendars(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        setLoadingCalendars(false)
        return
      }

      const { data, error } = await supabase
        .from('calendars')
        .select('*')
        .eq('user_id', session.user.id)

      if (error) {
        console.error('Error loading calendars:', error)
      } else {
        const calendars = data || []
        setAvailableCalendars(calendars)
        // Set the first calendar as selected if none is selected
        if (calendars.length > 0 && !selectedCalendarId) {
          setSelectedCalendarId(calendars[0].id)
        }
      }
    } finally {
      setLoadingCalendars(false)
    }
  }

  // Listen for calendar visibility changes from localStorage
  useEffect(() => {
    // Load calendars
    loadCalendars()

    // Load initial visible calendars from localStorage
    const stored = localStorage.getItem('visibleCalendars')
    if (stored) {
      try {
        const calendarIds = JSON.parse(stored)
        setVisibleCalendars(calendarIds)
      } catch (error) {
        console.error('Error parsing visible calendars:', error)
      }
    }

    // Listen for storage events (cross-tab and same-tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'visibleCalendars' && e.newValue) {
        try {
          const calendarIds = JSON.parse(e.newValue)
          setVisibleCalendars(calendarIds)
        } catch (error) {
          console.error('Error parsing visible calendars:', error)
        }
      } else if (e.key === 'calendarsUpdated') {
        // Reload calendars when they are updated
        loadCalendars()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  // Load events and check integration on component mount
  useEffect(() => {
    loadEvents()
    checkJiraIntegration()
  }, [isAuthenticated])

  // Reload events when selected calendar changes
  useEffect(() => {
    if (isAuthenticated && selectedCalendarId) {
      loadEvents()
    }
  }, [selectedCalendarId])

  // Custom event creation for database integration
  const createEvent = async (event: CalendarEventType) => {
    if (!selectedCalendarId) {
      console.error('No calendar selected')
      throw new Error('Please select a calendar first')
    }
    try {
      console.log('Creating event with data:', event)
      
      // Prepare data for API
      const eventData = {
        title: event.title,
        description: event.description,
        dueDate: event.databaseEvent?.due_date,
        triggerStart: event.databaseEvent?.trigger_start || event.start,
        triggerEnd: event.databaseEvent?.trigger_end || event.end,
        color: event.color,
        allDay: event.allDay,
        styles: event.styles || [],
        numberOfVariations: event.number_of_variations || 1,
        calendarId: selectedCalendarId
      }

      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.details || result.error || 'Failed to create event')
      }

      console.log('✅ Event created successfully:', result.event)
      
      // Add the created event to local state
      const createdEvent: CalendarEventType = {
        id: result.event.id,
        title: result.event.summary,
        description: result.event.description || '',
        start: result.event.trigger_start,
        end: result.event.trigger_end,
        color: result.event.color,
        allDay: false,
        databaseEvent: result.event
      }
      
      setEvents(prev => [...prev, createdEvent])
      return result.event

    } catch (error) {
      console.error('❌ Error creating event:', error)
      throw error // Re-throw so the modal can handle it
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
        <span className="ml-2 text-gray-600">Loading calendar events...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span className="text-red-800">{error}</span>
        </div>
        <button
          onClick={loadEvents}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Calendar Selector */}
      {isAuthenticated && availableCalendars.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-gray-600" />
                <label htmlFor="calendar-select" className="text-sm font-medium text-gray-900">
                  Active Calendar:
                </label>
              </div>
              <Select 
                value={selectedCalendarId || undefined}
                onValueChange={setSelectedCalendarId}
              >
                <SelectTrigger id="calendar-select" className="w-[250px]">
                  <SelectValue placeholder="Select a calendar" />
                </SelectTrigger>
                <SelectContent>
                  {availableCalendars.map((calendar) => (
                    <SelectItem key={calendar.id} value={calendar.id}>
                      <div className="flex items-center gap-2">
                        <span>{calendar.provider === 'JIRA' ? '🎯' : calendar.provider === 'MANUAL' ? '💾' : '📅'}</span>
                        <span>{calendar.name}</span>
                        <span className="text-xs text-gray-500">({calendar.provider})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-gray-500">
              Events will be added to this calendar
            </div>
          </div>
        </div>
      )}

      {/* Sync section */}
      {isAuthenticated && hasJiraIntegration && (
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Jira Integration</h3>
              <p className="text-sm text-gray-600">Sync your latest Jira issues to the calendar</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={cleanupDuplicates}
                disabled={isCleaningDuplicates || isSyncing}
                variant="outline"
                className="text-orange-600 border-orange-300 hover:bg-orange-50"
              >
                <Trash2 className={`w-4 h-4 mr-2 ${isCleaningDuplicates ? 'animate-pulse' : ''}`} />
                {isCleaningDuplicates ? 'Cleaning...' : 'Clean Duplicates'}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    disabled={isSyncing || isCleaningDuplicates}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Syncing...' : 'Sync'}
                    <ChevronDown className="w-4 h-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => syncJiraEvents(false)}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Quick Sync (incremental)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => syncJiraEvents(true)}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Full Sync (all events)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {/* Sync status */}
          {syncStatus && (
            <div className="mt-3 p-3 rounded-lg bg-gray-50">
              <p className="text-sm text-gray-700">{syncStatus}</p>
            </div>
          )}
        </div>
      )}

      {/* Calendar stats */}
      {isAuthenticated && events.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="text-2xl font-bold text-gray-900">{events.length}</div>
            <div className="text-sm text-gray-600">Total Events</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="text-2xl font-bold text-amber-600">
              {events.filter(e => e.databaseEvent?.status === 'pending').length}
            </div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="text-2xl font-bold text-violet-600">
              {events.filter(e => e.databaseEvent?.status === 'processing').length}
            </div>
            <div className="text-sm text-gray-600">Processing</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="text-2xl font-bold text-emerald-600">
              {events.filter(e => e.databaseEvent?.status === 'completed').length}
            </div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="text-2xl font-bold text-red-600">
              {events.filter(e => e.databaseEvent?.status === 'failed').length}
            </div>
            <div className="text-sm text-gray-600">Failed</div>
          </div>
        </div>
      )}

      {/* Show message if no calendars exist */}
      {!loadingCalendars && availableCalendars.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-amber-400 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-amber-800">No Calendars Available</h3>
              <p className="mt-1 text-sm text-amber-700">
                You need to create a calendar before you can add events. 
                Use the sidebar to create a local calendar or connect an external calendar.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Calendar component with database events */}
      <Calendar 
        initialEvents={filteredEvents}
        onCreateEvent={createEvent}
        onEventClick={handleEventClick}
        showCreateButton={isAuthenticated && availableCalendars.length > 0}
      />

      {/* Show selected calendar info in the calendar */}
      {selectedCalendarId && availableCalendars.length > 0 && (
        <div className="mt-2 text-center text-sm text-gray-500">
          Viewing calendar: <strong>{availableCalendars.find(c => c.id === selectedCalendarId)?.name}</strong>
        </div>
      )}

      {/* Event Details Modal */}
      <EnhancedEventDetailsModal
        open={eventDetailsOpen}
        onOpenChange={setEventDetailsOpen}
        event={selectedEvent}
        onEdit={handleEditEvent}
      />

      {/* Edit Event Modal */}
      <EnhancedEditEventModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        event={editEvent}
        onUpdate={updateEvent}
      />
    </div>
  )
}
