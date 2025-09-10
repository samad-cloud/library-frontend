'use client'

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { BreadcrumbNav } from '@/components/ui/breadcrumb-nav'
import { createClient } from '@/utils/supabase/client'
import { useEffect, useState } from 'react'

export default function Header() {
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUserEmail(user?.email || null)
    }
    getUser()
  }, [supabase])

  // Generate initials from email
  const getInitials = (email: string | null): string => {
    if (!email) return 'U' // Default to 'U' for User
    
    // Get the part before @ and take first letter, capitalized
    const emailPrefix = email.split('@')[0]
    return emailPrefix.charAt(0).toUpperCase()
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-5 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <BreadcrumbNav className="" />
      </div>

      <div className="flex items-center gap-4">
        {userEmail && (
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-pink-500 text-white text-sm">
              {getInitials(userEmail)}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </header>
  )
}