'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import CsvUploadSection from './CsvUploadSection'
import BatchProgressSection from './BatchProgressSection'

interface CsvTemplate {
  id: string
  name: string
  description: string
  template_type: string
  required_columns: string[]
  optional_columns: string[]
  column_descriptions: any
  sample_data: any
  is_default: boolean
  download_count: number
}

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

interface BulkGeneratorProps {
  isAuthenticated: boolean
}

export default function BulkGenerator({ isAuthenticated }: BulkGeneratorProps) {
  const [templates, setTemplates] = useState<CsvTemplate[]>([])
  const [batches, setBatches] = useState<CsvBatch[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  
  const supabase = createClient()

  useEffect(() => {
    if (isAuthenticated) {
      fetchTemplates()
      fetchBatches()
    } else {
      setLoading(false)
    }
  }, [isAuthenticated])

  // Set up real-time subscriptions for batch updates
  useEffect(() => {
    if (!isAuthenticated) return

    const subscription = supabase
      .channel('csv-batches-updates')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'csv_batches' 
      }, (payload) => {
        console.log('Batch update received:', payload)
        fetchBatches() // Refetch to get latest data
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [isAuthenticated, supabase])

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_available_csv_templates')

      if (error) throw error
      setTemplates(data || [])
    } catch (err) {
      console.error('Error fetching templates:', err)
      setError('Failed to load templates')
    }
  }

  const fetchBatches = async () => {
    try {
      const { data, error } = await supabase
        .from('csv_batches')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error
      setBatches(data || [])
    } catch (err) {
      console.error('Error fetching batches:', err)
      setError('Failed to load batches')
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (file: File, template?: CsvTemplate) => {
    if (!isAuthenticated) {
      setError('Please sign in to upload files')
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      // Create FormData for file upload
      const formData = new FormData()
      formData.append('file', file)
      if (template) {
        formData.append('template_id', template.id)
      }

      // Upload to our API endpoint (to be created)
      const response = await fetch('/api/csv/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        try {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Upload failed')
        } catch (parseError) {
          const errorText = await response.text()
          throw new Error(errorText || 'Upload failed')
        }
      }

      const result = await response.json()
      console.log('Upload successful:', result)

      // Refresh batches to show the new upload
      await fetchBatches()

      // Show success message
      setError(null)
    } catch (err) {
      console.error('Upload error:', err)
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDownloadTemplate = async (templateId: string) => {
    try {
      // Increment download count
      await supabase.rpc('increment_template_download', { p_template_id: templateId })
      
      // Download template file
      const response = await fetch(`/api/csv/templates/${templateId}/download`)
      if (!response.ok) throw new Error('Download failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // Get template name for filename
      const template = templates.find(t => t.id === templateId)
      link.download = template ? `${template.name.replace(/\s+/g, '_')}_template.csv` : 'template.csv'
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      // Refresh templates to update download count
      await fetchTemplates()
    } catch (err) {
      console.error('Download error:', err)
      setError('Failed to download template')
    }
  }

  const handleUploadTemplate = async (file: File) => {
    if (!isAuthenticated) {
      setError('Please sign in to upload templates')
      return
    }

    setError(null)
    setSuccessMessage(null)

    try {
      // Create FormData for template upload
      const formData = new FormData()
      formData.append('file', file)

      // Upload to our API endpoint (to be created)
      const response = await fetch('/api/csv/templates/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || 'Template upload failed')
      }

      const result = await response.json()
      console.log('Template upload successful:', result)

      // Refresh templates to show the new template
      await fetchTemplates()

      // Show success message
      setError(null)
      setSuccessMessage(`Template "${result.template.name}" uploaded successfully!`)
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000)
    } catch (err) {
      console.error('Template upload error:', err)
      setError(err instanceof Error ? err.message : 'Template upload failed')
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="h-screen bg-gray-50 flex flex-col">
        <div className="flex-1 overflow-auto">
          <div className="py-6">
            <div className="mb-8 px-6">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Bulk Generator
              </h1>
              <p className="text-muted-foreground">
                Discover our bulk image generation capabilities
              </p>
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  💡 Want to generate hundreds of product images from a spreadsheet?{' '}
                  <a href="/auth/login" className="font-medium underline hover:no-underline">
                    Sign in to get started
                  </a>
                </p>
              </div>
            </div>
            
            <div className="px-6">
              <div className="max-w-4xl">
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                  <div className="max-w-md mx-auto">
                    <h3 className="text-xl font-medium text-gray-900 mb-4">
                      Generate Images in Bulk
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Upload a CSV or Excel file with your product data and generate hundreds of images automatically. 
                      Our AI will create unique, high-quality images for each row in your spreadsheet.
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                      <h4 className="font-medium text-blue-900 mb-2">Features:</h4>
                      <ul className="text-sm text-blue-800 text-left space-y-1">
                        <li>• Process up to 50 products at once</li>
                        <li>• Multiple image styles and formats</li>
                        <li>• Real-time progress tracking</li>
                        <li>• CSV/Excel templates for easy setup</li>
                        <li>• Background processing - no need to wait</li>
                      </ul>
                    </div>
                    <a 
                      href="/auth/login" 
                      className="inline-flex items-center px-6 py-3 bg-pink-500 text-white font-medium rounded-lg hover:bg-pink-600 transition-colors"
                    >
                      Sign in to get started
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 overflow-auto">
        <div className="py-6">
          <div className="mb-8 px-6">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Bulk Generator
            </h1>
            <p className="text-muted-foreground">
              Upload CSV or Excel files to generate images for multiple products automatically
            </p>
          </div>

          <div className="px-6">
            <div className="max-w-6xl">
              {error && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800">{error}</p>
                </div>
              )}

              {successMessage && (
                <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800">{successMessage}</p>
                </div>
              )}

              <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                {/* Upload Section - 3/4 width */}
                <div className="xl:col-span-3">
                  <CsvUploadSection
                    onUpload={handleUpload}
                    isUploading={isUploading}
                    templates={templates}
                    onDownloadTemplate={handleDownloadTemplate}
                    onUploadTemplate={handleUploadTemplate}
                  />
                </div>

                {/* Progress Section - 1/4 width */}
                <div className="xl:col-span-1">
                  <BatchProgressSection 
                    batches={batches}
                    onRefresh={fetchBatches}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
