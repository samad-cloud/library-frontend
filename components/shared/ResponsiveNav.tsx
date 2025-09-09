'use client'

import { useState, useEffect } from 'react'
import { 
  LayoutDashboard, 
  Calendar, 
  Zap, 
  Edit, 
  Library, 
  Upload, 
  Settings, 
  Grid3X3,
  Menu,
  X,
  Bell,
  ChevronDown,
  Keyboard,
  Search
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation'

interface ResponsiveNavProps {
  user?: {
    email?: string
    name?: string
  }
}

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard", shortcut: "Ctrl+1" },
  { icon: Calendar, label: "Calendar", href: "/calendar", shortcut: "Ctrl+2" },
  { icon: Zap, label: "Generator", href: "/generator", shortcut: "Ctrl+3" },
  { icon: Grid3X3, label: "Bulk Generator", href: "/bulk-generator", shortcut: "Ctrl+4" },
  { icon: Edit, label: "Editor", href: "/editor", shortcut: "Ctrl+5" },
  { icon: Library, label: "Library", href: "/library", shortcut: "Ctrl+6" },
  { icon: Upload, label: "Upload", href: "/upload", shortcut: "Ctrl+7" },
  { icon: Settings, label: "Settings", href: "/settings", shortcut: "Ctrl+8" },
]

const integrations = [
  { name: "Google Calendar", color: "bg-green-500", connected: true },
  { name: "Jira", color: "bg-blue-500", connected: true },
  { name: "Outlook", color: "bg-orange-500", connected: false },
]

export default function ResponsiveNav({ user }: ResponsiveNavProps) {
  const pathname = usePathname()
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  
  // Enable keyboard navigation
  useKeyboardNavigation(true)

  // Get user initials
  const getUserInitials = () => {
    if (user?.name) {
      return user.name.split(' ').map(n => n[0]).join('').toUpperCase()
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase()
    }
    return 'U'
  }

  // Close mobile nav when route changes
  useEffect(() => {
    setIsMobileNavOpen(false)
  }, [pathname])

  // Prevent hydration issues
  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return null
  }

  return (
    <>
      {/* Desktop Sidebar - Hidden on mobile, responsive width on tablet */}
      <aside className="hidden lg:flex lg:w-64 xl:w-72 bg-white border-r border-gray-200 flex-col transition-all duration-300">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <Link href="/dashboard" className="block">
            <h1 className="text-xl font-bold text-gray-900 hover:text-pink-600 transition-colors">
              GeneraPix
            </h1>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4" role="navigation" aria-label="Main navigation">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <li key={item.label}>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link
                          href={item.href}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                            "focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2",
                            "min-h-[44px]", // Ensure minimum touch target size
                            isActive 
                              ? "bg-pink-500 text-white shadow-md" 
                              : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                          )}
                          aria-current={isActive ? 'page' : undefined}
                          aria-label={`Navigate to ${item.label}`}
                        >
                          <item.icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                          <span className="font-medium">{item.label}</span>
                          {isActive && (
                            <span className="sr-only">Current page</span>
                          )}
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="flex items-center gap-2">
                        <span>{item.label}</span>
                        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                          {item.shortcut}
                        </kbd>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </li>
              )
            })}
          </ul>

          {/* Integrations */}
          <div className="mt-8">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">
              INTEGRATIONS
            </h3>
            <ul className="space-y-2">
              {integrations.map((integration) => (
                <li key={integration.name} className="flex items-center gap-3 px-3 py-2">
                  <div 
                    className={cn(
                      "w-2 h-2 rounded-full",
                      integration.color,
                      !integration.connected && "opacity-40"
                    )} 
                  />
                  <span className={cn(
                    "text-sm",
                    integration.connected ? "text-gray-700" : "text-gray-400"
                  )}>
                    {integration.name}
                  </span>
                  {!integration.connected && (
                    <span className="text-xs text-gray-400 ml-auto">Not connected</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 px-3 py-2">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-pink-500 text-white text-sm">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.name || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.email || 'user@example.com'}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Trigger */}
            <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  aria-label="Toggle navigation menu"
                  data-menu-trigger
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] p-0">
                <SheetHeader className="p-6 border-b border-gray-200">
                  <SheetTitle className="text-xl font-bold text-gray-900">
                    GeneraPix
                  </SheetTitle>
                </SheetHeader>
                
                {/* Mobile Navigation */}
                <nav className="flex-1 overflow-y-auto">
                  <ul className="p-4 space-y-2">
                    {navItems.map((item) => {
                      const isActive = pathname === item.href
                      return (
                        <li key={item.label}>
                          <Link
                            href={item.href}
                            onClick={() => setIsMobileNavOpen(false)}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                              "focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-inset",
                              isActive 
                                ? "bg-pink-500 text-white shadow-md" 
                                : "text-gray-700 hover:bg-gray-100 active:bg-gray-200"
                            )}
                            aria-current={isActive ? 'page' : undefined}
                          >
                            <item.icon className="w-5 h-5 flex-shrink-0" />
                            <span className="font-medium">{item.label}</span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>

                  {/* Mobile Integrations */}
                  <div className="p-4 border-t border-gray-200">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">
                      INTEGRATIONS
                    </h3>
                    <ul className="space-y-2">
                      {integrations.map((integration) => (
                        <li key={integration.name} className="flex items-center gap-3 px-3 py-2">
                          <div 
                            className={cn(
                              "w-2 h-2 rounded-full",
                              integration.color,
                              !integration.connected && "opacity-40"
                            )} 
                          />
                          <span className={cn(
                            "text-sm",
                            integration.connected ? "text-gray-700" : "text-gray-400"
                          )}>
                            {integration.name}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </nav>

                {/* Mobile User Section */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
                  <div className="flex items-center gap-3 px-3 py-2">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-pink-500 text-white text-sm">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user?.name || 'User'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        Pro Plan
                      </p>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {/* Logo */}
            <Link href="/dashboard" className="font-bold text-lg text-gray-900">
              GeneraPix
            </Link>
          </div>

          {/* Mobile Right Actions */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-pink-500 text-white text-sm">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.name || 'User'}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email || 'user@example.com'}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings#billing">Billing</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600">
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
    </>
  )
}