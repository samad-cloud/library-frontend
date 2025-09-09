'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { 
  Calendar, 
  ChevronDown, 
  ChevronRight,
  Eye,
  EyeOff,
  RefreshCw,
  Settings,
  Plus,
  Trash2,
  Check,
  X,
  Loader2,
  AlertCircle,
  Cloud,
  Clock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { format, parseISO, isValid } from 'date-fns'
import { DepartmentType } from './types'
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
  provider: 'JIRA' | 'GOOGLE' | 'OUTLOOK' | 'LOCAL'
  color?: string
  last_synced?: string | null
  is_visible?: boolean
  config?: any
  user_id: string
  timezone?: string
  fetch_limit?: number
  created_at?: string
  updated_at?: string
}

interface CalendarSidebarProps {
  onCalendarToggle?: (calendarId: string, visible: boolean) => void
  onSync?: (calendarId: string) => Promise<void>
  className?: string
  visibleCalendars?: string[]
}

const PROVIDER_COLORS = {
  JIRA: 'bg-amber-500',
  GOOGLE: 'bg-green-500',
  OUTLOOK: 'bg-blue-500',
  LOCAL: 'bg-purple-500'
}

const PROVIDER_ICONS = {
  JIRA: '🎯',
  GOOGLE: '📅',
  OUTLOOK: '📧',
  LOCAL: '💾'
}

const DEPARTMENT_OPTIONS: { value: DepartmentType; label: string; description: string }[] = [
  { value: 'email_marketing', label: 'Email Marketing', description: 'Email campaigns and newsletters' },
  { value: 'google_sem', label: 'Google SEM', description: 'Search engine marketing and Google Ads' },
  { value: 'groupon', label: 'Groupon', description: 'Groupon deals and promotions' },
  { value: 'social_media', label: 'Social Media', description: 'Social media content and posts' }
]

export function CalendarSidebar({ 
  onCalendarToggle, 
  onSync,
  className,
  visibleCalendars = []
}: CalendarSidebarProps) {
  const [calendars, setCalendars] = useState<CalendarItem[]>([])
  const [loading, setLoading] = useState(true)
  const [syncingCalendars, setSyncingCalendars] = useState<Set<string>>(new Set())
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['imported', 'local']))
  const [creatingCalendar, setCreatingCalendar] = useState(false)
  const [newCalendarName, setNewCalendarName] = useState('')
  const [newCalendarDepartment, setNewCalendarDepartment] = useState<DepartmentType>('email_marketing')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  // Load calendars from database
  useEffect(() => {
    loadCalendars()
  }, [])

  const loadCalendars = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        setError('Not authenticated')
        return
      }

      const { data, error } = await supabase
        .from('calendars')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading calendars:', error)
        setError('Failed to load calendars')
        return
      }

      // Set is_visible based on visibleCalendars prop or default to true
      const calendarsWithVisibility = (data || []).map(cal => ({
        ...cal,
        is_visible: visibleCalendars.length > 0 
          ? visibleCalendars.includes(cal.id)
          : true
      }))

      setCalendars(calendarsWithVisibility)
    } catch (err) {
      console.error('Error loading calendars:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleVisibility = (calendarId: string) => {
    setCalendars(prev => prev.map(cal => {
      if (cal.id === calendarId) {
        const newVisibility = !cal.is_visible
        onCalendarToggle?.(calendarId, newVisibility)
        return { ...cal, is_visible: newVisibility }
      }
      return cal
    }))
  }

  const handleSync = async (calendar: CalendarItem) => {
    if (syncingCalendars.has(calendar.id)) return

    setSyncingCalendars(prev => new Set([...prev, calendar.id]))
    
    try {
      if (onSync) {
        await onSync(calendar.id)
      } else {
        // Default sync behavior - trigger sync via API
        const response = await fetch('/api/calendar-sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ calendarId: calendar.id })
        })

        if (!response.ok) {
          throw new Error('Sync failed')
        }
      }

      // Update last_synced time
      const { error } = await supabase
        .from('calendars')
        .update({ last_synced: new Date().toISOString() })
        .eq('id', calendar.id)

      if (error) {
        console.error('Error updating sync time:', error)
      }

      // Reload calendars to show updated sync time
      await loadCalendars()
    } catch (error) {
      console.error('Error syncing calendar:', error)
      setError(`Failed to sync ${calendar.name}`)
    } finally {
      setSyncingCalendars(prev => {
        const next = new Set(prev)
        next.delete(calendar.id)
        return next
      })
    }
  }

  const handleCreateCalendar = async () => {
    if (!newCalendarName.trim()) return

    try {
      setCreatingCalendar(true)
      setError(null)
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        setError('Not authenticated')
        return
      }

      const { data, error } = await supabase
        .from('calendars')
        .insert({
          user_id: session.user.id,
          name: newCalendarName.trim(),
          provider: 'LOCAL' as const,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          color: 'purple',
          is_visible: true,
          department: newCalendarDepartment
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating calendar:', error)
        setError('Failed to create calendar')
        return
      }

      // Reload calendars
      await loadCalendars()
      
      // Reset form
      setNewCalendarName('')
      setNewCalendarDepartment('email_marketing')
      setShowCreateDialog(false)
    } finally {
      setCreatingCalendar(false)
    }
  }

  const handleDeleteCalendar = async (calendarId: string) => {
    if (!confirm('Are you sure you want to delete this calendar? All associated events will be deleted.')) {
      return
    }

    try {
      setError(null)
      
      // Delete associated events first
      const { error: eventsError } = await supabase
        .from('calendar_events')
        .delete()
        .eq('calendar_id', calendarId)

      if (eventsError) {
        console.error('Error deleting events:', eventsError)
        setError('Failed to delete calendar events')
        return
      }

      // Delete the calendar
      const { error } = await supabase
        .from('calendars')
        .delete()
        .eq('id', calendarId)

      if (error) {
        console.error('Error deleting calendar:', error)
        setError('Failed to delete calendar')
        return
      }

      // Reload calendars
      await loadCalendars()
    } catch (err) {
      console.error('Error deleting calendar:', err)
      setError('An unexpected error occurred')
    }
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  const formatSyncTime = (lastSynced: string | null | undefined) => {
    if (!lastSynced) return 'Never synced'
    
    try {
      const date = parseISO(lastSynced)
      if (!isValid(date)) return 'Never synced'
      
      const now = new Date()
      const diff = now.getTime() - date.getTime()
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const days = Math.floor(hours / 24)
      
      if (days > 0) return `${days}d ago`
      if (hours > 0) return `${hours}h ago`
      return 'Just now'
    } catch {
      return 'Never synced'
    }
  }

  // Separate calendars by type
  const importedCalendars = calendars.filter(cal => cal.provider !== 'LOCAL')
  const localCalendars = calendars.filter(cal => cal.provider === 'LOCAL')

  if (loading) {
    return (
      <div className={cn("w-64 bg-white border-r border-gray-200 p-4", className)}>
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  return (
    <div className={cn("w-64 bg-white border-r border-gray-200 flex flex-col h-full", className)}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Calendars
          </h3>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost" className="p-1">
                <Plus className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Local Calendar</DialogTitle>
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
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 m-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Calendar List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Imported Calendars */}
        {importedCalendars.length > 0 && (
          <div>
            <button
              onClick={() => toggleSection('imported')}
              className="w-full flex items-center justify-between text-sm font-semibold text-gray-600 mb-2 hover:text-gray-900"
            >
              <span className="flex items-center gap-1">
                <Cloud className="w-4 h-4" />
                IMPORTED
              </span>
              {expandedSections.has('imported') ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
            
            {expandedSections.has('imported') && (
              <div className="space-y-2">
                {importedCalendars.map(calendar => (
                  <CalendarItem
                    key={calendar.id}
                    calendar={calendar}
                    isSyncing={syncingCalendars.has(calendar.id)}
                    onToggleVisibility={() => handleToggleVisibility(calendar.id)}
                    onSync={() => handleSync(calendar)}
                    onDelete={() => handleDeleteCalendar(calendar.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Local Calendars */}
        <div>
          <button
            onClick={() => toggleSection('local')}
            className="w-full flex items-center justify-between text-sm font-semibold text-gray-600 mb-2 hover:text-gray-900"
          >
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              LOCAL
            </span>
            {expandedSections.has('local') ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          
          {expandedSections.has('local') && (
            <div className="space-y-2">
              {localCalendars.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No local calendars</p>
              ) : (
                localCalendars.map(calendar => (
                  <CalendarItem
                    key={calendar.id}
                    calendar={calendar}
                    isSyncing={false}
                    onToggleVisibility={() => handleToggleVisibility(calendar.id)}
                    onSync={() => {}} // Local calendars don't sync
                    onDelete={() => handleDeleteCalendar(calendar.id)}
                    isLocal={true}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Individual Calendar Item Component
function CalendarItem({ 
  calendar, 
  isSyncing, 
  onToggleVisibility, 
  onSync, 
  onDelete,
  isLocal = false 
}: {
  calendar: CalendarItem
  isSyncing: boolean
  onToggleVisibility: () => void
  onSync: () => void
  onDelete: () => void
  isLocal?: boolean
}) {
  const formatSyncTime = (lastSynced: string | null | undefined) => {
    if (!lastSynced) return 'Never synced'
    
    try {
      const date = parseISO(lastSynced)
      if (!isValid(date)) return 'Never synced'
      
      const now = new Date()
      const diff = now.getTime() - date.getTime()
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const days = Math.floor(hours / 24)
      
      if (days > 0) return `${days}d ago`
      if (hours > 0) return `${hours}h ago`
      return 'Just now'
    } catch {
      return 'Never synced'
    }
  }

  return (
    <div className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2 flex-1">
          <div className={cn(
            "w-2 h-2 rounded-full mt-1.5",
            PROVIDER_COLORS[calendar.provider] || 'bg-gray-400'
          )} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900 truncate">
                {PROVIDER_ICONS[calendar.provider]} {calendar.name}
              </span>
              {!calendar.is_visible && (
                <EyeOff className="w-3 h-3 text-gray-400" />
              )}
            </div>
            {!isLocal && calendar.last_synced && (
              <div className="flex items-center gap-1 mt-1">
                <Clock className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-500">
                  {formatSyncTime(calendar.last_synced)}
                </span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <Switch
            checked={calendar.is_visible || false}
            onCheckedChange={onToggleVisibility}
            className="scale-75"
          />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="p-1">
                <Settings className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!isLocal && (
                <DropdownMenuItem onClick={onSync} disabled={isSyncing}>
                  {isSyncing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Sync Now
                    </>
                  )}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onClick={onDelete} 
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}