'use client'

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/utils/supabase/client"

interface ApiIntegrationsProps {
  setShowJiraModal: (show: boolean) => void
}

export default function ApiIntegrations({ setShowJiraModal }: ApiIntegrationsProps) {
  const [isJiraConnected, setIsJiraConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [disconnectError, setDisconnectError] = useState<string | null>(null)

  useEffect(() => {
    const checkJiraConnection = async () => {
      const supabase = createClient()
      
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) return

        const { data, error } = await supabase
          .from('external_integrations')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('type', 'JIRA')
          .single()

        if (error) {
          console.error('Error checking Jira connection:', error)
          return
        }

        setIsJiraConnected(!!data)
      } catch (error) {
        console.error('Error checking Jira connection:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkJiraConnection()
  }, [])

  return (
    <div className="mb-8">
      <h3 className="text-lg font-medium text-gray-900 mb-4">🔗 API Integrations</h3>

      {disconnectError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{disconnectError}</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Jira Integration</label>
        {isLoading ? (
          <Button variant="outline" disabled>
            Loading...
          </Button>
        ) : isJiraConnected ? (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="rounded-lg bg-white border-green-500 text-green-500"
              disabled
            >
              Connected
            </Button>
            <span className="text-sm text-green-500">✓</span>
            <Button
              variant="outline"
              className="rounded-lg bg-white border-red-500 text-red-500"
              onClick={async () => {
                // Confirm before disconnecting
                const confirmed = window.confirm(
                  'Are you sure you want to disconnect from Jira? This will delete all imported calendar events and cannot be undone.'
                )
                
                if (!confirmed) return
                try {
                  setIsLoading(true)
                  setDisconnectError(null)
                  const supabase = createClient()
                  const { data: { session } } = await supabase.auth.getSession()
                  
                  if (!session?.user) {
                    throw new Error('No authenticated user found')
                  }

                  // First get the JIRA calendars to clean up related events
                  const { data: jiraCalendars } = await supabase
                    .from('calendars')
                    .select('id')
                    .eq('user_id', session.user.id)
                    .eq('provider', 'JIRA')

                  // Delete calendar events for JIRA calendars
                  if (jiraCalendars && jiraCalendars.length > 0) {
                    const calendarIds = jiraCalendars.map(cal => cal.id)
                    const { error: eventsError } = await supabase
                      .from('calendar_events')
                      .delete()
                      .in('calendar_id', calendarIds)

                    if (eventsError) {
                      console.error('Error deleting calendar events:', eventsError)
                      throw new Error('Failed to delete calendar events')
                    }
                  }

                  // Delete JIRA calendars
                  const { error: calendarsError } = await supabase
                    .from('calendars')
                    .delete()
                    .eq('user_id', session.user.id)
                    .eq('provider', 'JIRA')

                  if (calendarsError) {
                    console.error('Error deleting calendars:', calendarsError)
                    throw new Error('Failed to delete calendars')
                  }

                  // Delete external integration
                  const { error: integrationError } = await supabase
                    .from('external_integrations')
                    .delete()
                    .eq('user_id', session.user.id)
                    .eq('type', 'JIRA') // Fixed: uppercase JIRA

                  if (integrationError) {
                    console.error('Error disconnecting Jira:', integrationError)
                    throw new Error('Failed to disconnect Jira integration')
                  }

                  setIsJiraConnected(false)
                  console.log('✅ Jira integration disconnected successfully')
                } catch (error) {
                  console.error('Error disconnecting Jira:', error)
                  setDisconnectError(error instanceof Error ? error.message : 'Failed to disconnect')
                } finally {
                  setIsLoading(false)
                }
              }}
            >
              Disconnect
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            className="rounded-lg bg-white border-[rgba(236,72,153,1)] text-[rgba(236,72,153,1)]"
            onClick={() => setShowJiraModal(true)}
          >
            Connect
          </Button>
        )}
      </div>
    </div>
  )
}