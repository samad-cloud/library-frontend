'use client'

import React from 'react'
import { Button } from "@/components/ui/button"
import { Instagram } from 'lucide-react'
import InstagramPostDialog from './InstagramPostDialog'

interface InstagramPostButtonProps {
  imageUrl?: string
  imageBase64?: string
  caption: string
  modelName?: string
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'destructive' | 'secondary'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  onSuccess?: (result: any) => void
  onError?: (error: string) => void
}

export default function InstagramPostButton({
  imageUrl,
  imageBase64,
  caption,
  modelName,
  variant = 'outline',
  size = 'sm',
  className = '',
  onSuccess,
  onError
}: InstagramPostButtonProps) {
  return (
    <InstagramPostDialog
      imageUrl={imageUrl}
      imageBase64={imageBase64}
      caption={caption}
      modelName={modelName}
      onSuccess={onSuccess}
      onError={onError}
      trigger={
        <Button 
          variant={variant} 
          size={size}
          className={`flex items-center gap-2 ${className}`}
        >
          <Instagram className="w-4 h-4" />
          Instagram
        </Button>
      }
    />
  )
}
