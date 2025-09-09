'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Loader2, Check, AlertCircle } from 'lucide-react'
import { saveGeneratedImage, SaveImageOptions } from '@/utils/supabase/imageStorage'
import { useToast } from '@/hooks/use-toast'

interface SaveImageButtonProps {
  imageUrl: string
  fileName?: string
  generator?: 'social-media' | 'email-marketing' | 'google-sem' | 'groupon'
  modelName?: string
  variant?: 'default' | 'ghost' | 'outline' | 'secondary'
  size?: 'default' | 'sm' | 'lg'
  className?: string
  children?: React.ReactNode
  disabled?: boolean
  promptUsed?: string
  aspectRatio?: string
}

export default function SaveImageButton({
  imageUrl,
  fileName,
  generator,
  modelName,
  variant = 'ghost',
  size = 'sm',
  className = '',
  children,
  disabled = false,
  promptUsed,
  aspectRatio
}: SaveImageButtonProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const { toast } = useToast()

  const handleSave = async () => {
    if (!imageUrl || isSaving || disabled) return

    setIsSaving(true)
    setSaveStatus('idle')

    try {
      const result = await saveGeneratedImage({
        imageUrl,
        fileName,
        generator,
        modelName,
        promptUsed,
        aspectRatio
      })

      if (result.success) {
        setSaveStatus('success')
        toast({
          title: "Image saved!",
          description: "Your generated image has been saved to your library.",
          duration: 3000,
        })
        
        // Reset success status after a delay
        setTimeout(() => setSaveStatus('idle'), 2000)
      } else {
        setSaveStatus('error')
        toast({
          title: "Save failed",
          description: result.error || "Failed to save image. Please try again.",
          variant: "destructive",
          duration: 5000,
        })
        
        // Reset error status after a delay
        setTimeout(() => setSaveStatus('idle'), 3000)
      }
    } catch (error) {
      setSaveStatus('error')
      toast({
        title: "Save failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
        duration: 5000,
      })
      
      setTimeout(() => setSaveStatus('idle'), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  const getIcon = () => {
    if (isSaving) return <Loader2 className="w-4 h-4 animate-spin" />
    if (saveStatus === 'success') return <Check className="w-4 h-4" />
    if (saveStatus === 'error') return <AlertCircle className="w-4 h-4" />
    return <Download className="w-4 h-4" />
  }

  const getButtonText = () => {
    if (isSaving) return 'Saving...'
    if (saveStatus === 'success') return 'Saved!'
    if (saveStatus === 'error') return 'Failed'
    return children || 'Save Image'
  }

  const getButtonStyle = () => {
    let baseClass = className
    
    if (saveStatus === 'success') {
      baseClass += ' text-green-600 hover:text-green-700'
    } else if (saveStatus === 'error') {
      baseClass += ' text-red-600 hover:text-red-700'
    }
    
    return baseClass
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={getButtonStyle()}
      onClick={handleSave}
      disabled={disabled || isSaving || !imageUrl}
    >
      {getIcon()}
      {(children || saveStatus !== 'idle' || isSaving) && (
        <span className="ml-2">{getButtonText()}</span>
      )}
    </Button>
  )
}
