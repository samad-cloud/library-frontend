'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Loader2, CheckCircle, AlertTriangle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { downloadImage, generateDownloadFileName } from '@/utils/downloadImage'

interface DownloadImageButtonProps {
  imageUrl: string
  fileName?: string
  generator?: string
  modelName?: string
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  children?: React.ReactNode
  disabled?: boolean
}

export default function DownloadImageButton({
  imageUrl,
  fileName,
  generator = 'generated',
  modelName = 'ai-model',
  variant = 'ghost',
  size = 'sm',
  className = '',
  children,
  disabled = false
}: DownloadImageButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'success' | 'warning' | 'error'>('idle')
  const { toast } = useToast()

  const handleDownload = async () => {
    if (!imageUrl || isDownloading || disabled) return

    setIsDownloading(true)
    setDownloadStatus('idle')

    try {
      const downloadFileName = fileName || generateDownloadFileName({
        generator,
        modelName,
        imageUrl
      })

      const result = await downloadImage({
        imageUrl,
        fileName: downloadFileName,
        generator,
        modelName
      })

      if (result.success) {
        if (result.error) {
          // Success with warning (opened in new tab)
          setDownloadStatus('warning')
          toast({
            title: "Download initiated",
            description: result.error,
            duration: 5000,
          })
        } else {
          // Complete success
          setDownloadStatus('success')
          toast({
            title: "Download started",
            description: "Your image download has been initiated.",
            duration: 3000,
          })
        }
        
        // Reset status after a delay
        setTimeout(() => setDownloadStatus('idle'), 2000)
      } else {
        setDownloadStatus('error')
        toast({
          title: "Download failed",
          description: result.error || "Failed to download image. Please try again.",
          variant: "destructive",
          duration: 5000,
        })
        
        // Reset error status after a delay
        setTimeout(() => setDownloadStatus('idle'), 3000)
      }
    } catch (error) {
      setDownloadStatus('error')
      toast({
        title: "Download failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
        duration: 5000,
      })
      
      setTimeout(() => setDownloadStatus('idle'), 3000)
    } finally {
      setIsDownloading(false)
    }
  }

  const getIcon = () => {
    if (isDownloading) {
      return <Loader2 className="w-4 h-4 mr-2 animate-spin" />
    }
    
    switch (downloadStatus) {
      case 'success':
        return <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
      case 'warning':
        return <AlertTriangle className="w-4 h-4 mr-2 text-yellow-500" />
      case 'error':
        return <AlertTriangle className="w-4 h-4 mr-2 text-red-500" />
      default:
        return <Download className="w-4 h-4 mr-2" />
    }
  }

  const getButtonText = () => {
    if (isDownloading) return 'Downloading...'
    
    switch (downloadStatus) {
      case 'success':
        return 'Downloaded!'
      case 'warning':
        return 'Opened in tab'
      case 'error':
        return 'Download failed'
      default:
        return children || 'Download'
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleDownload}
      disabled={disabled || isDownloading}
    >
      {getIcon()}
      {getButtonText()}
    </Button>
  )
}
