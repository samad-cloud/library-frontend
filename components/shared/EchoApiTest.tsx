'use client'

import { useState } from 'react'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Alert, AlertDescription } from '../ui/alert'

export function EchoApiTest() {
  const [input, setInput] = useState('{\n  "message": "Hello World",\n  "timestamp": "2024-01-01T00:00:00Z",\n  "data": {\n    "key": "value"\n  }\n}')
  const [response, setResponse] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const testEchoApi = async () => {
    setLoading(true)
    setError(null)
    setResponse(null)

    try {
      // Parse the input to validate JSON
      const parsedInput = JSON.parse(input)
      
      const response = await fetch('/api/echo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(parsedInput)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setResponse(data)
    } catch (err) {
      console.error('Echo API test error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Echo API Test</CardTitle>
        <CardDescription>
          Test the echo API endpoint that returns the exact data you send to it.
          Endpoint: <code className="bg-gray-100 px-1 rounded">POST /api/echo</code>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label htmlFor="json-input" className="block text-sm font-medium mb-2">
            JSON Input (edit the JSON below):
          </label>
          <Textarea
            id="json-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={8}
            className="font-mono text-sm"
            placeholder="Enter JSON data to send to the echo API..."
          />
        </div>

        <Button 
          onClick={testEchoApi} 
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Sending...' : 'Test Echo API'}
        </Button>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              <strong>Error:</strong> {error}
            </AlertDescription>
          </Alert>
        )}

        {response && (
          <div>
            <label className="block text-sm font-medium mb-2">API Response:</label>
            <div className="bg-gray-50 p-4 rounded-lg border">
              <pre className="text-sm overflow-auto whitespace-pre-wrap">
                {JSON.stringify(response, null, 2)}
              </pre>
            </div>
          </div>
        )}

        <div className="mt-4 text-sm text-gray-600">
          <h4 className="font-medium mb-2">Usage Example:</h4>
          <div className="bg-gray-50 p-3 rounded border">
            <pre className="text-xs overflow-auto">
{`fetch('/api/echo', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    your: 'data',
    goes: 'here'
  })
})`}
            </pre>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
