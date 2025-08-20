'use client'

import { useState } from 'react'
import { X, Loader2, AlertCircle } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface JiraModalProps {
  onClose: () => void
}

export default function JiraModal({ onClose }: JiraModalProps) {
  const [jiraUrl, setJiraUrl] = useState('')
  const [username, setUsername] = useState('')
  const [apiToken, setApiToken] = useState('')
  const [projectName, setProjectName] = useState('')
  const [issueType, setIssueType] = useState('')
  const [fetchLimit, setFetchLimit] = useState(200) // Default fetch limit
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get current month and year for Jira query
  const now = new Date()
  const currentMonth = now.getMonth() + 1 // JavaScript months are 0-based
  const currentYear = now.getFullYear()

  async function handleConnect() {
    if (!jiraUrl || !username || !apiToken || !projectName || !issueType) {
      setError('All fields are required')
      return
    }

    if (fetchLimit < 1 || fetchLimit > 1000) {
      setError('Fetch limit must be between 1 and 1000')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/connect-jira', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jiraUrl: jiraUrl.trim(),
          username: username.trim(),
          apiToken: apiToken.trim(),
          projectName: projectName.trim(),
          issueType: issueType.trim(),
          fetchLimit: fetchLimit,
          month: currentMonth,
          year: currentYear
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect to Jira')
      }

      // Show success message before closing
      const eventsMessage = data.newly_inserted 
        ? `Successfully connected and imported ${data.newly_inserted} calendar events from ${projectName}.`
        : 'Successfully connected to Jira.'
        
      // Brief delay to show success message
      await new Promise(resolve => setTimeout(resolve, 1500))
      onClose()
    } catch (err) {
      console.error('Error connecting to Jira:', err)
      setError(err instanceof Error ? err.message : 'Failed to connect to Jira')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center rounded-lg z-10">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-pink-500" />
              <p className="mt-2 text-sm text-gray-600">Connecting to Jira and importing calendar events...</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Connect to Jira</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isLoading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jira URL</label>
            <input
              type="text"
              value={jiraUrl}
              onChange={(e) => setJiraUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              placeholder="https://yourcompany.atlassian.net"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              placeholder="your-email@company.com"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API Token</label>
            <input
              type="password"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              placeholder="Enter your API token"
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-gray-500">
              Generate an API token from your Atlassian account settings
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              placeholder="e.g. EMCP"
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-gray-500">
              The Jira project key or name you want to sync events from
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Issue Type</label>
            <input
              type="text"
              value={issueType}
              onChange={(e) => setIssueType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              placeholder="e.g. Email"
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-gray-500">
              The type of issues to import as calendar events
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fetch Limit</label>
            <input
              type="number"
              min="1"
              max="1000"
              value={fetchLimit}
              onChange={(e) => setFetchLimit(parseInt(e.target.value) || 200)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              placeholder="200"
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-gray-500">
              Maximum number of issues to fetch per sync (1-1000, default: 200)
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            className="flex-1 bg-pink-500 hover:bg-pink-600 text-white rounded-lg"
            onClick={handleConnect}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              'Connect'
            )}
          </Button>
          <Button
            variant="outline"
            className="flex-1 rounded-lg bg-transparent"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}