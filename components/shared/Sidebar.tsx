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
  Eye,
  EyeOff,
  RefreshCw,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Loader2,
  Clock,
  ExternalLink,
  CalendarPlus
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { parseISO, isValid } from 'date-fns'
import { DepartmentType } from '../calendar/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface CalendarItem {
  id: string
  name: string
  provider: 'JIRA' | 'GOOGLE' | 'OUTLOOK' | 'MANUAL'
  color?: string
  last_synced?: string | null
  is_visible?: boolean
  config?: any
  user_id: string
}

interface SidebarProps {
  onCalendarToggle?: (calendarId: string, visible: boolean) => void
}

const DEPARTMENT_OPTIONS: { value: DepartmentType; label: string; description: string }[] = [
  { value: 'email_marketing', label: 'Email Marketing', description: 'Email campaigns and newsletters' },
  { value: 'google_sem', label: 'Google SEM', description: 'Search engine marketing and Google Ads' },
  { value: 'groupon', label: 'Groupon', description: 'Groupon deals and promotions' },
  { value: 'social_media', label: 'Social Media', description: 'Social media content and posts' }
]

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Calendar, label: "Calendar", href: "/calendar" },
  { icon: Zap, label: "Generator", href: "/generator" },
  { icon: Grid3X3, label: "Bulk Generator", href: "/bulk-generator" },
  { icon: Edit, label: "Editor", href: "/editor" },
  { icon: Library, label: "Library", href: "/library" },
  // { icon: Upload, label: "Upload", href: "/upload" }, // Disabled
  { icon: Settings, label: "Settings", href: "/settings" },
]

const PROVIDER_COLORS = {
  JIRA: 'bg-amber-500',
  GOOGLE: 'bg-green-500', 
  OUTLOOK: 'bg-blue-500',
  MANUAL: 'bg-purple-500'
}

const PROVIDER_ICONS = {
  JIRA: '🎯',
  GOOGLE: '📅',
  OUTLOOK: '📧',
  MANUAL: '💾'
}

export default function Sidebar({ onCalendarToggle }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [calendars, setCalendars] = useState<CalendarItem[]>([])
  const [loading, setLoading] = useState(false)
  const [syncingCalendars, setSyncingCalendars] = useState<Set<string>>(new Set())
  const [showTypeSelectionDialog, setShowTypeSelectionDialog] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newCalendarName, setNewCalendarName] = useState('')
  const [newCalendarDepartment, setNewCalendarDepartment] = useState<DepartmentType>('email_marketing')
  const [creatingCalendar, setCreatingCalendar] = useState(false)
  const [expandedIntegrations, setExpandedIntegrations] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [calendarToDelete, setCalendarToDelete] = useState<CalendarItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const supabase = createClient()

  // Load calendars on mount
  useEffect(() => {
    loadCalendars()
  }, [])

  const loadCalendars = async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return

      const { data, error } = await supabase
        .from('calendars')
        .select('*')
        .eq('user_id', session.user.id)
        .order('provider', { ascending: true })
        .order('name', { ascending: true })

      if (error) {
        console.error('Error loading calendars:', error)
        return
      }

      const calendarsData = data || []
      setCalendars(calendarsData)
      
      // Initialize localStorage with all visible calendars
      const visibleCalendarIds = calendarsData
        .filter(cal => cal.is_visible !== false)
        .map(cal => cal.id)
      localStorage.setItem('visibleCalendars', JSON.stringify(visibleCalendarIds))
      
      // Dispatch event for initial load
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'visibleCalendars',
        newValue: JSON.stringify(visibleCalendarIds),
        url: window.location.href
      }))
    } finally {
      setLoading(false)
    }
  }

  const handleToggleVisibility = (calendar: CalendarItem) => {
    const newVisibility = !calendar.is_visible
    
    setCalendars(prev => prev.map(cal => 
      cal.id === calendar.id ? { ...cal, is_visible: newVisibility } : cal
    ))
    
    // Update visible calendars in localStorage for CalendarPage
    const currentVisible = calendars
      .filter(cal => cal.id === calendar.id ? newVisibility : cal.is_visible !== false)
      .map(cal => cal.id)
    localStorage.setItem('visibleCalendars', JSON.stringify(currentVisible))
    
    // Dispatch storage event for same-tab updates
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'visibleCalendars',
      newValue: JSON.stringify(currentVisible),
      url: window.location.href
    }))
    
    // Notify parent component if provided
    onCalendarToggle?.(calendar.id, newVisibility)
    
    // Update in database
    supabase
      .from('calendars')
      .update({ is_visible: newVisibility })
      .eq('id', calendar.id)
      .then(({ error }) => {
        if (error) console.error('Error updating visibility:', error)
      })
  }

  const handleSync = async (calendar: CalendarItem) => {
    if (syncingCalendars.has(calendar.id) || calendar.provider === 'MANUAL') return

    setSyncingCalendars(prev => new Set([...prev, calendar.id]))
    
    try {
      // Trigger sync via API
      const response = await fetch('/api/calendar-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calendarId: calendar.id })
      })

      if (!response.ok) throw new Error('Sync failed')

      // Update last_synced time
      await supabase
        .from('calendars')
        .update({ last_synced: new Date().toISOString() })
        .eq('id', calendar.id)

      await loadCalendars()
    } catch (error) {
      console.error('Error syncing calendar:', error)
    } finally {
      setSyncingCalendars(prev => {
        const next = new Set(prev)
        next.delete(calendar.id)
        return next
      })
    }
  }

  const handleCalendarTypeSelection = (type: 'manual' | 'external') => {
    setShowTypeSelectionDialog(false)
    
    if (type === 'manual') {
      setShowCreateDialog(true)
    } else {
      // Navigate to settings integrations page
      router.push('/settings?tab=integrations')
    }
  }

  const handleCreateCalendar = async () => {
    if (!newCalendarName.trim()) return

    try {
      setCreatingCalendar(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return

      const { error } = await supabase
        .from('calendars')
        .insert({
          user_id: session.user.id,
          name: newCalendarName.trim(),
          provider: 'MANUAL',
          is_visible: true,
          department: newCalendarDepartment
        })

      if (error) {
        console.error('Error creating calendar:', error)
        return
      }

      await loadCalendars()
      setNewCalendarName('')
      setNewCalendarDepartment('email_marketing')
      setShowCreateDialog(false)
      
      // Notify CalendarPage that calendars have been updated
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'calendarsUpdated',
        newValue: 'true',
        url: window.location.href
      }))
    } finally {
      setCreatingCalendar(false)
    }
  }

  const handleDeleteCalendar = async (calendar: CalendarItem) => {
    setCalendarToDelete(calendar)
    setDeleteDialogOpen(true)
  }

  const confirmDeleteCalendar = async () => {
    if (!calendarToDelete) return

    try {
      setIsDeleting(true)
      // Delete events first
      await supabase
        .from('calendar_events')
        .delete()
        .eq('calendar_id', calendarToDelete.id)

      // Delete calendar
      const { error } = await supabase
        .from('calendars')
        .delete()
        .eq('id', calendarToDelete.id)

      if (error) {
        console.error('Error deleting calendar:', error)
        return
      }

      await loadCalendars()
      
      // Notify CalendarPage that calendars have been updated
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'calendarsUpdated',
        newValue: 'true',
        url: window.location.href
      }))
      
      setDeleteDialogOpen(false)
      setCalendarToDelete(null)
    } catch (error) {
      console.error('Error deleting calendar:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const formatSyncTime = (lastSynced: string | null | undefined) => {
    if (!lastSynced) return 'Never'
    try {
      const date = parseISO(lastSynced)
      if (!isValid(date)) return 'Never'
      
      const now = new Date()
      const diff = now.getTime() - date.getTime()
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const days = Math.floor(hours / 24)
      
      if (days > 0) return `${days}d ago`
      if (hours > 0) return `${hours}h ago`
      return 'Just now'
    } catch {
      return 'Never'
    }
  }

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-gray-200">
        <Link href="/dashboard" aria-label="GeneraPix Home">
          <div className="text-xl font-bold text-gray-900 hover:text-pink-600 transition-colors cursor-pointer">
            GeneraPix
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {sidebarItems.map((item) => (
            <li key={item.label}>
              <Link
                href={item.href}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  pathname === item.href ? "bg-pink-500 text-white" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Calendars & Integrations */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setExpandedIntegrations(!expandedIntegrations)}
              className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700"
            >
              {expandedIntegrations ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              CALENDARS
            </button>
            <button 
              onClick={() => setShowTypeSelectionDialog(true)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <Plus className="w-3 h-3 text-gray-500" />
            </button>
          </div>
          
          {expandedIntegrations && (
            <ul className="space-y-1 max-h-64 overflow-y-auto">
              {loading ? (
                <li className="px-3 py-2">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Loading...
                  </div>
                </li>
              ) : calendars.length === 0 ? (
                <li className="px-3 py-2 text-sm text-gray-500 italic">
                  No calendars
                </li>
              ) : (
                calendars.map((calendar) => (
                  <li key={calendar.id} className="group relative">
                    <div className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 rounded">
                      <div className={cn(
                        "w-2 h-2 rounded-full flex-shrink-0",
                        PROVIDER_COLORS[calendar.provider] || 'bg-gray-400'
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-gray-700 truncate">
                            {PROVIDER_ICONS[calendar.provider]} {calendar.name}
                          </span>
                          {!calendar.is_visible && (
                            <EyeOff className="w-3 h-3 text-gray-400" />
                          )}
                        </div>
                        {calendar.provider !== 'MANUAL' && calendar.last_synced && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5 text-gray-400" />
                            <span className="text-xs text-gray-400">
                              {formatSyncTime(calendar.last_synced)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                        <Switch
                          checked={calendar.is_visible !== false}
                          onCheckedChange={() => handleToggleVisibility(calendar)}
                          className="scale-[0.6]"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button 
                              className="p-0.5 hover:bg-gray-100 rounded"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Settings className="w-3 h-3 text-gray-500" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            {calendar.provider !== 'MANUAL' && (
                              <DropdownMenuItem 
                                onClick={() => handleSync(calendar)}
                                disabled={syncingCalendars.has(calendar.id)}
                              >
                                {syncingCalendars.has(calendar.id) ? (
                                  <>
                                    <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                                    Syncing...
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw className="w-3 h-3 mr-2" />
                                    Sync Now
                                  </>
                                )}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={() => handleDeleteCalendar(calendar)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="w-3 h-3 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      </nav>

      {/* Calendar Type Selection Dialog */}
      <Dialog open={showTypeSelectionDialog} onOpenChange={setShowTypeSelectionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Add Calendar</DialogTitle>
            <DialogDescription className="text-center">
              Choose how you want to add a calendar
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <button
              onClick={() => handleCalendarTypeSelection('manual')}
              className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 rounded-lg hover:border-pink-500 hover:bg-pink-50 transition-all group"
            >
              <CalendarPlus className="w-10 h-10 text-gray-600 group-hover:text-pink-500" />
              <div className="text-center">
                <div className="font-semibold text-gray-900 group-hover:text-pink-600">
                  Manual Calendar
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Create a local calendar for manually added events
                </div>
              </div>
            </button>
            
            <button
              onClick={() => handleCalendarTypeSelection('external')}
              className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
            >
              <ExternalLink className="w-10 h-10 text-gray-600 group-hover:text-blue-500" />
              <div className="text-center">
                <div className="font-semibold text-gray-900 group-hover:text-blue-600">
                  External Calendar
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Connect to Jira, Google Calendar, or Outlook
                </div>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Manual Calendar Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Manual Calendar</DialogTitle>
            <DialogDescription>
              Create a local calendar for manually added events
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="calendar-name">Calendar Name</Label>
              <Input
                id="calendar-name"
                value={newCalendarName}
                onChange={(e) => setNewCalendarName(e.target.value)}
                placeholder="e.g., Personal Projects"
                disabled={creatingCalendar}
              />
            </div>
            <div>
              <Label htmlFor="calendar-department">Department</Label>
              <Select
                value={newCalendarDepartment}
                onValueChange={(value: DepartmentType) => setNewCalendarDepartment(value)}
                disabled={creatingCalendar}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENT_OPTIONS.map((dept) => (
                    <SelectItem key={dept.value} value={dept.value}>
                      <div className="flex flex-col">
                        <span className="font-medium">{dept.label}</span>
                        <span className="text-sm text-muted-foreground">{dept.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                This determines which AI assistant will process events from this calendar
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateDialog(false)
                  setNewCalendarName('')
                  setNewCalendarDepartment('email_marketing')
                }}
                disabled={creatingCalendar}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateCalendar}
                disabled={creatingCalendar || !newCalendarName.trim()}
              >
                {creatingCalendar ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Calendar</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{calendarToDelete?.name}"? 
              This action cannot be undone. All events in this calendar will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setDeleteDialogOpen(false)
                setCalendarToDelete(null)
              }}
              disabled={isDeleting}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteCalendar}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Calendar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}