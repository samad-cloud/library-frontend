'use client'

import { useState, useEffect } from 'react'
import { Trash2, Eye, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { createClient } from '@/utils/supabase/client'
import FileContentModal from '@/components/modals/FileContentModal'
import FileUploadSection from './FileUploadSection'

interface KnowledgeBase {
  id: string
  file_names: string[]
  description: string
  vector_store_id: string
  embedding_model: string
  created_at: string
  files?: Array<{
    id: string
    status: string
    last_error: string | null
    created_at: number
  }>
}

interface ViewFileInfo {
  vectorStoreId: string
  fileId: string
}

interface VectorStoreFile {
  id: string
  object: string
  created_at: number
  vector_store_id: string
  status: string
  last_error: string | null
}

interface VectorStoreFilesResponse {
  object: string
  data: VectorStoreFile[]
}

export default function KnowledgeBaseUpload() {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [viewingFile, setViewingFile] = useState<ViewFileInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedKBs, setExpandedKBs] = useState<Set<string>>(new Set())
  const supabase = createClient()

  useEffect(() => {
    fetchKnowledgeBases()
  }, [])

  async function fetchKnowledgeBases() {
    try {
      const { data: kbData, error: kbError } = await supabase
        .from('knowledge_bases')
        .select('*')
        .order('created_at', { ascending: false })

      if (kbError) throw kbError

      // Fetch files for each knowledge base
      const enrichedKBs = await Promise.all(
        kbData.map(async (kb) => {
          try {
            const response = await fetch(`/api/vector-store/${kb.vector_store_id}/files`)
            if (!response.ok) {
              console.error(`Failed to fetch files for vector store ${kb.vector_store_id}:`, await response.text())
              return kb
            }
            
            const data: VectorStoreFilesResponse = await response.json()
            
            // Map OpenAI's response format to our interface
            return {
              ...kb,
              files: data.data.map(file => ({
                id: file.id,
                status: file.status,
                last_error: file.last_error,
                created_at: file.created_at
              }))
            }
          } catch (err) {
            console.error(`Error fetching files for vector store ${kb.vector_store_id}:`, err)
            return kb
          }
        })
      )

      setKnowledgeBases(enrichedKBs)
    } catch (err) {
      console.error('Error fetching knowledge bases:', err)
      setError('Failed to load knowledge bases')
    }
  }

  async function handleUpload(files: FileList) {
    setIsUploading(true)
    setError(null)

    try {
      // Create a new vector store
      const createStoreResponse = await fetch('/api/vector-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: files[0].name,
          description: `Vector store for ${files[0].name}`,
          embedding_model: 'text-embedding-3-small'
        })
      })

      if (!createStoreResponse.ok) {
        const errorText = await createStoreResponse.text()
        console.error('Failed to create vector store:', errorText)
        throw new Error('Failed to create vector store')
      }

      const { vector_store_id } = await createStoreResponse.json()

      // Upload files to the vector store
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData()
        formData.append('file', file)

        const uploadResponse = await fetch(`/api/vector-store/${vector_store_id}/files`, {
          method: 'POST',
          body: formData
        })

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text()
          console.error(`Failed to upload ${file.name}:`, errorText)
          throw new Error(`Failed to upload ${file.name}`)
        }

        return uploadResponse.json()
      })

      await Promise.all(uploadPromises)

      // Create knowledge base record in Supabase
      const { error: supabaseError } = await supabase
        .from('knowledge_bases')
        .insert({
          vector_store_id,
          description: `Knowledge base for ${files[0].name}`,
          file_names: Array.from(files).map(f => f.name),
          embedding_model: 'text-embedding-3-small'
        })

      if (supabaseError) throw supabaseError

      // Refresh the list
      await fetchKnowledgeBases()
    } catch (err) {
      console.error('Error uploading files:', err)
      setError(err instanceof Error ? err.message : 'Failed to upload files')
    } finally {
      setIsUploading(false)
    }
  }

  async function handleDelete(kbId: string, vectorStoreId: string) {
    try {
      // Delete from OpenAI
      const deleteResponse = await fetch(`/api/vector-store/${vectorStoreId}`, {
        method: 'DELETE'
      })

      if (!deleteResponse.ok) {
        const errorText = await deleteResponse.text()
        console.error('Failed to delete vector store:', errorText)
        throw new Error('Failed to delete vector store')
      }

      // Delete from Supabase
      const { error: supabaseError } = await supabase
        .from('knowledge_bases')
        .delete()
        .eq('id', kbId)

      if (supabaseError) throw supabaseError

      // Update local state
      setKnowledgeBases(prev => prev.filter(kb => kb.id !== kbId))
    } catch (err) {
      console.error('Error deleting knowledge base:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete knowledge base')
    }
  }

  const toggleKBExpansion = (kbId: string) => {
    setExpandedKBs(prev => {
      const newSet = new Set(prev)
      if (newSet.has(kbId)) {
        newSet.delete(kbId)
      } else {
        newSet.add(kbId)
      }
      return newSet
    })
  }

  function getStatusColor(status: string, lastError: string | null): string {
    if (lastError) return 'text-red-500'
    switch (status.toLowerCase()) {
      case 'completed':
        return 'text-green-500'
      case 'processing':
        return 'text-yellow-500'
      default:
        return 'text-gray-500'
    }
  }

  function getStatusIcon(status: string, lastError: string | null) {
    if (lastError) {
      return <AlertCircle className="w-4 h-4 text-red-500" title={lastError} />
    }
    return null
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl">
        <h2 className="text-2xl font-semibold text-gray-900 mb-8">Knowledge Base</h2>

        {/* Upload Area */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <FileUploadSection
            onUpload={handleUpload}
            isUploading={isUploading}
            accept=".txt,.pdf,.doc,.docx"
            maxFiles={5}
          />
          {error && (
            <p className="text-red-500 text-sm mt-2">{error}</p>
          )}
        </div>

        {/* Knowledge Bases List */}
        <div className="space-y-4">
          {knowledgeBases.map((kb) => (
            <div key={kb.id} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">{kb.description}</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-500 hover:text-gray-700"
                      onClick={() => toggleKBExpansion(kb.id)}
                    >
                      {expandedKBs.has(kb.id) ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  
                  {/* File List - Only shown when expanded */}
                  {expandedKBs.has(kb.id) && kb.files && kb.files.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <h4 className="text-sm font-medium text-gray-700">Files:</h4>
                      <div className="pl-4 space-y-2">
                        {kb.files.map((file) => (
                          <div key={file.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600">
                                {file.id}
                              </span>
                              <span className={`text-xs ${getStatusColor(file.status, file.last_error)}`}>
                                {file.status}
                              </span>
                              {getStatusIcon(file.status, file.last_error)}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-gray-500 hover:text-gray-700"
                              onClick={() => setViewingFile({
                                vectorStoreId: kb.vector_store_id,
                                fileId: file.id
                              })}
                              disabled={file.status !== 'completed'}
                            >
                              <Eye className="w-4 h-4" />
                              <span className="ml-1">View</span>
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                    <span>Model: {kb.embedding_model}</span>
                    <span>Created: {new Date(kb.created_at).toLocaleDateString()}</span>
                    <span>Files: {kb.files?.length || 0}</span>
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:bg-red-50 ml-4"
                  onClick={() => handleDelete(kb.id, kb.vector_store_id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* File Content Modal */}
      {viewingFile && (
        <FileContentModal
          vectorStoreId={viewingFile.vectorStoreId}
          fileId={viewingFile.fileId}
          onClose={() => setViewingFile(null)}
        />
      )}
    </div>
  )
}