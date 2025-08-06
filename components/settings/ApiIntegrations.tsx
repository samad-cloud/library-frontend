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
          .eq('type', 'jira')
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
                try {
                  setIsLoading(true)
                  const supabase = createClient()
                  const { data: { session } } = await supabase.auth.getSession()
                  
                  if (!session?.user) return

                  const { error } = await supabase
                    .from('external_integrations')
                    .delete()
                    .eq('user_id', session.user.id)
                    .eq('type', 'jira')

                  if (error) {
                    console.error('Error disconnecting Jira:', error)
                    return
                  }

                  setIsJiraConnected(false)
                } catch (error) {
                  console.error('Error disconnecting Jira:', error)
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