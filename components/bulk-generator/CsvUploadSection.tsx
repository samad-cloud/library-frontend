'use client'

import { useCallback, useState, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Download, FileText, AlertCircle, CheckCircle, Plus, Eye } from 'lucide-react'
import { Button } from "@/components/ui/button"

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

interface CsvUploadSectionProps {
  onUpload: (file: File, template?: CsvTemplate) => Promise<void>
  isUploading: boolean
  templates: CsvTemplate[]
  onDownloadTemplate: (templateId: string) => Promise<void>
  onUploadTemplate: (file: File) => Promise<void>
}

interface CsvValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  preview: any[]
  totalRows: number
  detectedColumns: string[]
  matchedTemplate?: CsvTemplate
}

export default function CsvUploadSection({ 
  onUpload, 
  isUploading, 
  templates,
  onDownloadTemplate,
  onUploadTemplate
}: CsvUploadSectionProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [validation, setValidation] = useState<CsvValidationResult | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<CsvTemplate | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<CsvTemplate | null>(null)
  const [isUploadingTemplate, setIsUploadingTemplate] = useState(false)

  // Handle ESC key to close preview modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && previewTemplate) {
        setPreviewTemplate(null)
      }
    }

    if (previewTemplate) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [previewTemplate])

  const validateCsv = useCallback(async (file: File): Promise<CsvValidationResult> => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string
          const lines = text.split('\n').filter(line => line.trim())
          
          if (lines.length < 2) {
            resolve({
              isValid: false,
              errors: ['File must contain at least a header row and one data row'],
              warnings: [],
              preview: [],
              totalRows: 0,
              detectedColumns: [],
              matchedTemplate: undefined
            })
            return
          }

          const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''))
          const dataRows = lines.slice(1, 6) // Preview first 5 rows
          const preview = dataRows.map(row => {
            const values = row.split(',').map(v => v.trim().replace(/['"]/g, ''))
            const obj: any = {}
            headers.forEach((header, index) => {
              obj[header] = values[index] || ''
            })
            return obj
          })

          // Try to match with a template
          let matchedTemplate: CsvTemplate | undefined
          let errors: string[] = []
          let warnings: string[] = []

          // Find best matching template
          for (const template of templates) {
            const hasAllRequired = template.required_columns.every(col => 
              headers.some(h => h.toLowerCase().includes(col.toLowerCase()))
            )
            if (hasAllRequired) {
              matchedTemplate = template
              break
            }
          }

          if (!matchedTemplate && templates.length > 0) {
            errors.push('File does not match any available template. Please select a template that matches your file format or update your file.')
            // List available templates and their requirements
            const templateList = templates.map(t => 
              `• ${t.name}: requires ${t.required_columns.join(', ')}`
            ).join('\n')
            warnings.push(`Available templates:\n${templateList}`)
          }

          // Basic validation
          if (headers.length < 2) {
            errors.push('CSV must have at least 2 columns')
          }
          
                      if (lines.length > 51) { // 50 data rows + 1 header row
              errors.push('Too many rows. Maximum allowed is 50 rows of data.')
            }

          resolve({
            isValid: errors.length === 0,
            errors,
            warnings,
            preview,
            totalRows: lines.length - 1,
            detectedColumns: headers,
            matchedTemplate
          })
        } catch (error) {
          resolve({
            isValid: false,
            errors: ['Invalid CSV format. Please check your file.'],
            warnings: [],
            preview: [],
            totalRows: 0,
            detectedColumns: [],
            matchedTemplate: undefined
          })
        }
      }
      reader.readAsText(file)
    })
  }, [templates])

  const onDrop = useCallback(async (acceptedFiles: File[], rejectedFiles: any[]) => {
    // Handle rejected files (wrong file type)
    if (rejectedFiles.length > 0) {
      const rejectedFile = rejectedFiles[0]
      const errorMessages = rejectedFile.errors.map((error: any) => {
        if (error.code === 'file-invalid-type') {
          return `Invalid file type: ${rejectedFile.file.name}. Please upload a CSV or Excel file (.csv, .xlsx, .xls)`
        }
        return error.message
      })
      
      setValidation({
        isValid: false,
        errors: errorMessages,
        warnings: [],
        preview: [],
        totalRows: 0,
        detectedColumns: []
      })
      setSelectedFile(null)
      return
    }

    const file = acceptedFiles[0]
    if (file) {
      setSelectedFile(file)
      const validationResult = await validateCsv(file)
      setValidation(validationResult)
      if (validationResult.matchedTemplate) {
        setSelectedTemplate(validationResult.matchedTemplate)
      }
    }
  }, [validateCsv])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv', '.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxFiles: 1,
    multiple: false,
    onDropRejected: (rejectedFiles) => {
      // This will be handled in onDrop callback above
    }
  })

  const handleUpload = async () => {
    if (selectedFile && validation?.isValid) {
      await onUpload(selectedFile, selectedTemplate || undefined)
      setSelectedFile(null)
      setValidation(null)
      setSelectedTemplate(null)
    }
  }

  const getValidationIcon = () => {
    if (!validation) return null
    if (validation.isValid) {
      return <CheckCircle className="w-5 h-5 text-green-500" />
    } else {
      return <AlertCircle className="w-5 h-5 text-red-500" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Template Selection */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Choose a Template</h3>
          <div className="hidden">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (file) {
                  setIsUploadingTemplate(true)
                  try {
                    await onUploadTemplate(file)
                  } finally {
                    setIsUploadingTemplate(false)
                  }
                  e.target.value = '' // Reset input
                }
              }}
              id="template-upload"
              disabled={isUploadingTemplate}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => document.getElementById('template-upload')?.click()}
            className="flex items-center gap-2"
            title="Upload a CSV or Excel file to create a custom template. Only column headers will be saved. File size is unlimited since data rows are removed."
            disabled={isUploadingTemplate}
          >
            {isUploadingTemplate ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Upload Template
              </>
            )}
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-4">
          {templates.map((template) => (
            <div 
              key={template.id}
              className={`border-2 rounded-lg p-4 cursor-pointer transition-colors flex flex-col h-full ${
                selectedTemplate?.id === template.id 
                  ? 'border-pink-500 bg-pink-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedTemplate(template)}
            >
              {/* Header with title and badges */}
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-gray-900 flex-1 mr-2">{template.name}</h4>
                <div className="flex gap-1 flex-shrink-0">
                  {template.is_default && (
                    <span className="bg-pink-100 text-pink-800 text-xs px-2 py-1 rounded whitespace-nowrap">
                      Default
                    </span>
                  )}
                  {template.template_type === 'custom' && (
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded whitespace-nowrap">
                      Custom
                    </span>
                  )}
                </div>
              </div>
              
              {/* Description */}
              <p className="text-sm text-gray-600 mb-4 flex-1">{template.description}</p>
              
              {/* Footer with downloads and buttons */}
              <div className="flex flex-col gap-3">
                <div className="text-xs text-gray-500">
                  {template.download_count} downloads
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setPreviewTemplate(template)
                    }}
                    className="text-xs flex-1"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Preview
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDownloadTemplate(template.id)
                    }}
                    className="text-xs flex-1"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="text-xs text-gray-500 mb-4">
          💡 <strong>Tip:</strong> When uploading a template, only column headers will be saved. Any data rows will be removed to create a clean template structure. File size is unlimited for templates.
        </div>
        
        {selectedTemplate && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Template Requirements</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-blue-800">Required columns:</span>
                <ul className="list-disc list-inside text-blue-700 mt-1">
                  {selectedTemplate.required_columns.map(col => (
                    <li key={col}>{col}</li>
                  ))}
                </ul>
              </div>
              <div>
                <span className="font-medium text-blue-800">Optional columns:</span>
                <ul className="list-disc list-inside text-blue-700 mt-1">
                  {selectedTemplate.optional_columns.map(col => (
                    <li key={col}>{col}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* File Upload */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload CSV File</h3>
        
        <div {...getRootProps()} className="mb-6">
          <input {...getInputProps()} />
          <div className={`bg-gray-50 p-8 rounded-lg border-2 border-dashed transition-colors cursor-pointer ${
            isDragActive ? 'border-pink-500 bg-pink-50' : 'border-gray-300 hover:border-gray-400'
          }`}>
            <FileText className={`w-12 h-12 mx-auto mb-4 ${isDragActive ? 'text-pink-500' : 'text-gray-400'}`} />
            {isUploading ? (
              <div>
                <p className="text-lg font-medium text-gray-900 mb-2">Processing...</p>
                <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : (
              <>
                <p className="text-lg font-medium text-gray-900 mb-2">
                  {isDragActive ? 'Drop file here' : 'Upload CSV or Excel File'}
                </p>
                <p className="text-gray-600 mb-4">
                  Drag and drop your CSV or Excel file here, or click to browse
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Accepted formats: .csv, .xlsx, .xls (up to 50 rows)
                </p>
                <Button 
                  type="button"
                  className="bg-pink-500 hover:bg-pink-600 text-white rounded-lg"
                  disabled={isUploading}
                >
                  Choose File
                </Button>
              </>
            )}
          </div>
        </div>

        {/* File Validation Results */}
        {selectedFile && validation && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {getValidationIcon()}
              <h4 className="font-medium text-gray-900">
                File: {selectedFile.name}
              </h4>
              <span className="text-sm text-gray-500">
                ({validation.totalRows} rows)
              </span>
            </div>

            {/* Errors */}
            {validation.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h5 className="font-medium text-red-800 mb-2">Errors:</h5>
                <ul className="text-sm text-red-700">
                  {validation.errors.map((error, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Warnings */}
            {validation.warnings.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h5 className="font-medium text-yellow-800 mb-2">Warnings:</h5>
                <ul className="text-sm text-yellow-700">
                  {validation.warnings.map((warning, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Template Match */}
            {validation.matchedTemplate && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h5 className="font-medium text-green-800 mb-2">
                  ✅ Matched Template: {validation.matchedTemplate.name}
                </h5>
                <p className="text-sm text-green-700">
                  Your CSV structure matches this template. Processing will use optimized settings.
                </p>
              </div>
            )}

            {/* CSV Preview */}
            {validation.preview.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h5 className="font-medium text-gray-800 mb-3">Preview (first 5 rows):</h5>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-300">
                        {validation.detectedColumns.map(col => (
                          <th key={col} className="text-left p-2 font-medium text-gray-700">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {validation.preview.map((row, index) => (
                        <tr key={index} className="border-b border-gray-200">
                          {validation.detectedColumns.map(col => (
                            <td key={col} className="p-2 text-gray-600">
                              {String(row[col] || '').substring(0, 50)}
                              {String(row[col] || '').length > 50 ? '...' : ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Upload Button */}
            {validation.isValid && (validation.matchedTemplate || selectedTemplate) && (
              <div className="flex justify-end">
                <Button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="bg-pink-500 hover:bg-pink-600 text-white"
                >
                  {isUploading ? 'Processing...' : `Start Bulk Generation (${validation.totalRows} rows)`}
                </Button>
              </div>
            )}

            {/* Template Selection Required Message */}
            {validation.isValid && !validation.matchedTemplate && !selectedTemplate && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-blue-800 mb-1">Template Required</p>
                    <p className="text-sm text-blue-700">
                      To proceed with generation, please select a template that matches your file format above.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Template Preview Modal */}
      {previewTemplate && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setPreviewTemplate(null)
            }
          }}
        >
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {previewTemplate.name}
                </h3>
                <p className="text-sm text-gray-600">{previewTemplate.description}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewTemplate(null)}
                className="shrink-0"
              >
                Close
              </Button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Column Structure */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Column Structure</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Required Columns */}
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h5 className="font-medium text-red-800 mb-2">
                      Required Columns ({previewTemplate.required_columns.length})
                    </h5>
                    <ul className="space-y-1">
                      {previewTemplate.required_columns.map(col => (
                        <li key={col} className="text-sm text-red-700 flex items-center gap-2">
                          <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                          <span className="font-medium">{col}</span>
                          {previewTemplate.column_descriptions?.[col] && (
                            <span className="text-red-600 text-xs">
                              - {previewTemplate.column_descriptions[col]}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Optional Columns */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h5 className="font-medium text-blue-800 mb-2">
                      Optional Columns ({previewTemplate.optional_columns.length})
                    </h5>
                    {previewTemplate.optional_columns.length > 0 ? (
                      <ul className="space-y-1">
                        {previewTemplate.optional_columns.map(col => (
                          <li key={col} className="text-sm text-blue-700 flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            <span className="font-medium">{col}</span>
                            {previewTemplate.column_descriptions?.[col] && (
                              <span className="text-blue-600 text-xs">
                                - {previewTemplate.column_descriptions[col]}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-blue-600">No optional columns</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Sample Data Preview */}
              {previewTemplate.sample_data && Array.isArray(previewTemplate.sample_data) && previewTemplate.sample_data.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Sample Data</h4>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-300">
                          {[...previewTemplate.required_columns, ...previewTemplate.optional_columns].map(col => (
                            <th key={col} className="text-left p-2 font-medium text-gray-700 bg-gray-100">
                              {col}
                              {previewTemplate.required_columns.includes(col) && (
                                <span className="text-red-500 ml-1">*</span>
                              )}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewTemplate.sample_data.map((row: any, index: number) => (
                          <tr key={index} className="border-b border-gray-200">
                            {[...previewTemplate.required_columns, ...previewTemplate.optional_columns].map(col => (
                              <td key={col} className="p-2 text-gray-600">
                                {String(row[col] || '').substring(0, 50)}
                                {String(row[col] || '').length > 50 ? '...' : ''}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    <span className="text-red-500">*</span> Required columns must be filled
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <Button
                  onClick={() => {
                    setSelectedTemplate(previewTemplate)
                    setPreviewTemplate(null)
                  }}
                  className="bg-pink-500 hover:bg-pink-600 text-white"
                >
                  Use This Template
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    onDownloadTemplate(previewTemplate.id)
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPreviewTemplate(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
