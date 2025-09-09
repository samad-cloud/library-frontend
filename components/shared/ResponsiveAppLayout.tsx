'use client'

import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import ResponsiveNav from './ResponsiveNav'
import ErrorBoundary from './ErrorBoundary'
import { BreadcrumbNav, MobileBreadcrumb } from '@/components/ui/breadcrumb-nav'
import { Bell } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

interface ResponsiveAppLayoutProps {
  children: ReactNode
  user?: {
    email?: string
    name?: string
  }
}

export default function ResponsiveAppLayout({ children, user }: ResponsiveAppLayoutProps) {

  return (
    <div className="flex h-screen bg-gray-50 relative">
      {/* Responsive Navigation */}
      <ResponsiveNav user={user} />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Desktop Header */}
        <header className="hidden lg:flex bg-white border-b border-gray-200 px-6 py-4 items-center justify-between">
          <div className="flex flex-col gap-2">
            <BreadcrumbNav className="" />
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
              <Bell className="w-5 h-5 text-gray-500" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
            </Button>
            
            {/* Plan Badge */}
            <span className="text-sm text-pink-500 font-medium">Pro Plan</span>
            
            {/* User Avatar */}
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-pink-500 text-white text-sm">
                {user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'JD'}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="lg:hidden px-4 py-3 bg-white border-b border-gray-200">
            <MobileBreadcrumb className="" />
          </div>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}