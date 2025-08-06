'use client'

import { useState, useEffect } from 'react'
import CalendarHeader from './CalendarHeader'
import CalendarGrid from './CalendarGrid'
import CampaignModal from '@/components/modals/CampaignModal'
import { createClient } from '@/utils/supabase/client'

interface CalendarEvent {
  id: string
  event_id: string
  summary: string
  description: string
  issue_type: string
  due_date: string
  raw_data: any
}

interface Campaign {
  id: string
  name: string
  date: string
  description?: string
  issue_type?: string
  raw_data?: any
  triggerTiming?: string
  details?: string
  region?: string
  products?: string[]
  styles?: string[]
  variations?: number
}

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showCampaignModal, setShowCampaignModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchEvents = async () => {
    try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session?.user) {
          setIsLoading(false)
          return
        }

        // Get the start and end of the current month
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

        const { data, error } = await supabase
          .from('calendar_events')
          .select('*')
          .eq('user_id', session.user.id)
          .gte('due_date', startOfMonth.toISOString())
          .lte('due_date', endOfMonth.toISOString())
          .order('due_date', { ascending: true })

        if (error) {
          console.error('Error fetching calendar events:', error)
          return
        }

        setEvents(data || [])
      } catch (error) {
        console.error('Error fetching calendar events:', error)
      } finally {
        setIsLoading(false)
      }
    }

  useEffect(() => {
    fetchEvents()
  }, [currentDate]) // Refetch when month changes

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true)
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user) return

      // Get the Jira integration credentials
      const { data: integration, error: integrationError } = await supabase
        .from('external_integrations')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('type', 'jira')
        .single()

      if (integrationError || !integration) {
        console.error('No Jira integration found:', integrationError)
        return
      }

      // Call the API route to fetch new events
      const response = await fetch('/api/connect-jira/route', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credentials: integration.credentials,
          action: 'sync'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to sync Jira events')
      }

      // After syncing, fetch the updated events
      await fetchEvents()
    } catch (error) {
      console.error('Error refreshing Jira events:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const navigateToPreviousMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const navigateToNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const navigateToToday = () => {
    const today = new Date()
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1))
  }

  const openCampaignModal = (date?: Date) => {
    if (date) {
      setSelectedDate(date)
    } else {
      setSelectedDate(null)
    }
    setShowCampaignModal(true)
  }

  return (
    <>
      <CalendarHeader
        currentDate={currentDate}
        navigateToPreviousMonth={navigateToPreviousMonth}
        navigateToNextMonth={navigateToNextMonth}
        navigateToToday={navigateToToday}
        openCampaignModal={() => openCampaignModal()}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      <CalendarGrid
        currentDate={currentDate}
        existingCampaigns={events.map(event => ({
          id: event.event_id,
          name: event.summary,
          date: new Date(event.due_date).toISOString().split('T')[0],
          description: event.description,
          issue_type: event.issue_type,
          raw_data: event.raw_data
        }))}
        openCampaignModal={openCampaignModal}
        isLoading={isLoading}
      />

      {showCampaignModal && (
        <CampaignModal
          selectedDate={selectedDate}
          onClose={() => setShowCampaignModal(false)}
          existingCampaigns={events.map(event => ({
            id: event.event_id,
            name: event.summary,
            date: new Date(event.due_date).toISOString().split('T')[0],
            description: event.description,
            issue_type: event.issue_type,
            raw_data: event.raw_data
          }))}
        />
      )}
    </>
  )
}