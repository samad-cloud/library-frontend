'use client'

import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload } from 'lucide-react'
import { Button } from "@/components/ui/button"

interface FileUploadSectionProps {
  onUpload: (files: FileList) => void
  isUploading: boolean
  accept?: string
  maxFiles?: number
}

export default function FileUploadSection({ 
  onUpload, 
  isUploading, 
  accept = '.txt,.pdf,.doc,.docx', 
  maxFiles = 5 
}: FileUploadSectionProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Convert the accepted files array to a FileList
    const dataTransfer = new DataTransfer()
    acceptedFiles.forEach(file => {
      dataTransfer.items.add(file)
    })
    onUpload(dataTransfer.files)
  }, [onUpload])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: accept.split(',').reduce((acc, curr) => {
      acc[curr] = []
      return acc
    }, {} as Record<string, string[]>),
    maxFiles,
    multiple: true
  })

  return (
    <div {...getRootProps()} className="mb-8">
      <input {...getInputProps()} />
      <div className="bg-gray-50 p-8 rounded-lg border-2 border-dashed border-gray-300 text-center hover:border-gray-400 transition-colors cursor-pointer">
        <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragActive ? 'text-pink-500' : 'text-gray-400'}`} />
        {isUploading ? (
          <div>
            <p className="text-lg font-medium text-gray-900 mb-2">Uploading...</p>
            <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : (
          <>
            <p className="text-lg font-medium text-gray-900 mb-2">
              {isDragActive ? 'Drop files here' : 'Upload Knowledge Base Files'}
            </p>
            <p className="text-gray-600 mb-4">
              Drag and drop files here, or click to browse
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Accepted formats: {accept}
            </p>
            <Button 
              type="button"
              className="bg-pink-500 hover:bg-pink-600 text-white rounded-lg"
              disabled={isUploading}
            >
              Choose Files
            </Button>
          </>
        )}
      </div>
    </div>
  )
}