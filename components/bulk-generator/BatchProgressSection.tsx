'use client'

import { useState } from 'react'
import { RefreshCw, Clock, CheckCircle, XCircle, AlertCircle, Pause, Play, Trash2, Eye } from 'lucide-react'
import { Button } from "@/components/ui/button"

interface CsvBatch {
  id: string
  filename: string
  original_filename: string
  total_rows: number
  processed_rows: number
  successful_rows: number
  failed_rows: number
  status: string
  created_at: string
  template_id?: string
  error_message?: string
}

interface BatchProgressSectionProps {
  batches: CsvBatch[]
  onRefresh: () => Promise<void>
}

export default function BatchProgressSection({ batches, onRefresh }: BatchProgressSectionProps) {
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    await onRefresh()
    setRefreshing(false)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'processing':
        return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'paused':
        return <Pause className="w-4 h-4 text-yellow-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50'
      case 'processing':
        return 'text-blue-600 bg-blue-50'
      case 'failed':
        return 'text-red-600 bg-red-50'
      case 'paused':
        return 'text-yellow-600 bg-yellow-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const calculateProgress = (batch: CsvBatch) => {
    if (batch.total_rows === 0) return 0
    return Math.round((batch.processed_rows / batch.total_rows) * 100)
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}d ago`
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Recent Batches</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {batches.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-gray-500">No batches yet</p>
          <p className="text-sm text-gray-400">Upload a CSV to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {batches.map((batch) => (
            <div key={batch.id} className="border border-gray-200 rounded-lg p-4">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusIcon(batch.status)}
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {batch.original_filename}
                    </h4>
                  </div>
                  <p className="text-xs text-gray-500">
                    {formatTimeAgo(batch.created_at)} • {batch.total_rows} rows
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(batch.status)}`}>
                  {batch.status}
                </span>
              </div>

              {/* Progress Bar */}
              {batch.status === 'processing' || batch.status === 'completed' ? (
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{calculateProgress(batch)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-pink-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${calculateProgress(batch)}%` }}
                    />
                  </div>
                </div>
              ) : null}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                <div className="text-center">
                  <div className="font-medium text-gray-900">{batch.processed_rows}</div>
                  <div className="text-gray-500">Processed</div>
                </div>
                <div className="text-center">
                  <div className="font-medium text-green-600">{batch.successful_rows}</div>
                  <div className="text-gray-500">Success</div>
                </div>
                <div className="text-center">
                  <div className="font-medium text-red-600">{batch.failed_rows}</div>
                  <div className="text-gray-500">Failed</div>
                </div>
              </div>

              {/* Error Message */}
              {batch.error_message && (
                <div className="bg-red-50 border border-red-200 rounded p-2 mb-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700">{batch.error_message}</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => {
                    // TODO: Open batch details modal
                    console.log('View batch details:', batch.id)
                  }}
                >
                  <Eye className="w-3 h-3 mr-1" />
                  View
                </Button>
                
                {batch.status === 'processing' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      // TODO: Pause batch processing
                      console.log('Pause batch:', batch.id)
                    }}
                  >
                    <Pause className="w-3 h-3" />
                  </Button>
                )}
                
                {batch.status === 'paused' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      // TODO: Resume batch processing
                      console.log('Resume batch:', batch.id)
                    }}
                  >
                    <Play className="w-3 h-3" />
                  </Button>
                )}
                
                {['completed', 'failed', 'cancelled'].includes(batch.status) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs text-red-600 hover:bg-red-50"
                    onClick={() => {
                      // TODO: Delete batch
                      console.log('Delete batch:', batch.id)
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {batches.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-gray-900">
                {batches.filter(b => b.status === 'processing').length}
              </div>
              <div className="text-xs text-gray-500">Active</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">
                {batches.filter(b => b.status === 'completed').length}
              </div>
              <div className="text-xs text-gray-500">Completed</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
