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
    // Create a simple default template for the UI
    setTemplates([
      {
        id: 'default-template',
        name: 'Bulk Generation Template',
        description: 'Template with required columns: country, product_type, mpn, size',
        template_type: 'bulk_generation',
        required_columns: ['country', 'product_type', 'mpn', 'size'],
        optional_columns: [],
        column_descriptions: {},
        sample_data: {},
        is_default: true,
        download_count: 0
      }
    ])
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
      // Parse CSV file
      const text = await file.text()
      const lines = text.trim().split('\n')
      
      // Proper CSV parsing that handles quoted fields with commas
      const parseCSVLine = (line: string): string[] => {
        const result: string[] = []
        let current = ''
        let inQuotes = false
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i]
          
          if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
              // Escaped quote
              current += '"'
              i++ // Skip next quote
            } else {
              // Toggle quote state
              inQuotes = !inQuotes
            }
          } else if (char === ',' && !inQuotes) {
            // End of field
            result.push(current.trim())
            current = ''
          } else {
            current += char
          }
        }
        
        // Add the last field
        result.push(current.trim())
        return result
      }

      const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, '')) // Remove surrounding quotes
      
      // Validate required columns exist
      const requiredColumns = ['country', 'product_type', 'mpn', 'size']
      const missingColumns = requiredColumns.filter(col => !headers.includes(col))
      
      if (missingColumns.length > 0) {
        throw new Error(`Missing required columns: ${missingColumns.join(', ')}. Your CSV must include: ${requiredColumns.join(', ')}`)
      }
      
      // Convert CSV to array of objects
      const csvData = lines.slice(1).filter(line => line.trim()).map((line, index) => {
        const values = parseCSVLine(line).map(v => v.replace(/^"|"$/g, '')) // Remove surrounding quotes
        const row: Record<string, any> = {}
        headers.forEach((header, headerIndex) => {
          const value = values[headerIndex]
          // Convert empty, whitespace-only, or undefined values to NULL for consistency
          if (value === undefined || value === '' || (typeof value === 'string' && value.trim() === '')) {
            row[header] = null
          } else {
            row[header] = value
          }
        })
        
        // Validate that this row has the required fields (NULL values are considered missing)
        const missingFields = requiredColumns.filter(col => row[col] === null || row[col] === '' || (typeof row[col] === 'string' && row[col].trim() === ''))
        if (missingFields.length > 0) {
          throw new Error(`Row ${index + 2} is missing required fields: ${missingFields.join(', ')}`)
        }
        
        return row
      })
      
      if (csvData.length === 0) {
        throw new Error('CSV file appears to be empty or contains no valid data rows')
      }
      
      console.log(`Parsed ${csvData.length} rows from CSV:`, csvData.slice(0, 2)) // Log first 2 rows for debugging

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Send to bulk processing endpoint
      const response = await fetch('/api/bulk-csv-process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          csvData,
          aspectRatio: '1:1',
          batchSize: 5,
          userId: user.id
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to start bulk processing')
      }

      const result = await response.json()
      console.log('Bulk processing started:', result)

      // Refresh batches to show the new job
      await fetchBatches()

      // Show success message
      setError(null)
      setSuccessMessage(`Bulk processing job started! Job ID: ${result.jobId}`)
      
      // Clear success message after 10 seconds
      setTimeout(() => setSuccessMessage(null), 10000)
    } catch (err) {
      console.error('Upload error:', err)
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDownloadTemplate = async (templateId: string) => {
    try {
      // Create a simple CSV template with required columns
      const templateContent = [
        'country,product_type,mpn,size',
        'France,Widget,ABC123,Large',
        'Germany,Gadget,XYZ456,Medium',
        'Spain,Tool,DEF789,Small'
      ].join('\n')
      
      // Create and download the file
      const blob = new Blob([templateContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'bulk_generation_template.csv'
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      // Show success message
      setSuccessMessage('Template downloaded successfully!')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      console.error('Download error:', err)
      setError('Failed to download template')
    }
  }

  const handleUploadTemplate = async (file: File) => {
    // For now, just show a message that template upload is not needed
    setSuccessMessage('Template upload is not needed! Simply ensure your CSV has columns: country, product_type, mpn, size')
    setTimeout(() => setSuccessMessage(null), 5000)
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
