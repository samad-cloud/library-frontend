'use client'

import { useState, useEffect } from 'react'
import { X, Download, Copy, Check } from 'lucide-react'
import { Button } from "@/components/ui/button"

interface FileContent {
  file_id: string
  filename: string
  attributes: Record<string, any>
  data: Array<{ type: string; text: string }>
}

interface FileContentModalProps {
  vectorStoreId: string
  fileId: string
  onClose: () => void
}

export default function FileContentModal({ vectorStoreId, fileId, onClose }: FileContentModalProps) {
  const [content, setContent] = useState<FileContent | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchFileContent()
  }, [vectorStoreId, fileId])

  async function fetchFileContent() {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/vector-store/${vectorStoreId}/files/${fileId}/content`)
      if (!response.ok) {
        throw new Error('Failed to fetch file content')
      }

      const data = await response.json()
      setContent(data)
    } catch (err) {
      console.error('Error fetching file content:', err)
      setError(err instanceof Error ? err.message : 'Failed to load file content')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCopyContent() {
    if (!content) return

    const textContent = content.data
      .filter(item => item.type === 'text')
      .map(item => item.text)
      .join('\n\n')

    try {
      await navigator.clipboard.writeText(textContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy content:', err)
    }
  }

  function downloadContent() {
    if (!content) return

    const textContent = content.data
      .filter(item => item.type === 'text')
      .map(item => item.text)
      .join('\n\n')

    const blob = new Blob([textContent], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = content.filename
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                {content?.filename || 'File Content'}
              </h3>
              {content?.file_id && (
                <p className="text-sm text-gray-500">ID: {content.file_id}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-gray-600 hover:text-gray-900"
                onClick={handleCopyContent}
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-gray-600 hover:text-gray-900"
                onClick={downloadContent}
              >
                <Download className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </Button>
            </div>
          </div>

          <div className="overflow-y-auto max-h-[60vh]">
            {isLoading && (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
              </div>
            )}

            {error && (
              <div className="text-red-500 text-center py-4">
                {error}
              </div>
            )}

            {content && (
              <div className="space-y-4">
                {/* File Attributes
                {Object.keys(content.data).length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-700 mb-2">Attributes</h4>
                    <dl className="grid grid-cols-2 gap-2">
                      {Object.entries(content.data).map(([key, value]) => (
                        <div key={key}>
                          <dt className="text-sm font-medium text-gray-500">{key}</dt>
                          <dd className="text-sm text-gray-900">{String(value)}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )} */}

                {/* File Content */}
                <div className="prose max-w-none">
                  {content.data.map((item, index) => (
                    <div key={index} className="mb-4">
                      {item.type === 'text' && (
                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                          <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800">
                            {item.text.trimStart()}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              className="rounded-lg"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}