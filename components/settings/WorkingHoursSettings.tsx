'use client'

import { useState, useEffect } from 'react'
import { Clock, Calendar, Info } from 'lucide-react'
import { UserPreferences } from '@/types/preferences'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface WorkingHoursSettingsProps {
  preferences: UserPreferences
  updatePreferences: (updates: Partial<UserPreferences>) => void
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
]

const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
]

export default function WorkingHoursSettings({
  preferences,
  updatePreferences,
}: WorkingHoursSettingsProps) {
  const [workingHours, setWorkingHours] = useState({
    start: preferences.working_hours_start || '09:00',
    end: preferences.working_hours_end || '18:00',
    days: preferences.working_days || [1, 2, 3, 4, 5], // Mon-Fri default
    timezone: preferences.timezone || 'UTC',
    highlightEnabled: preferences.highlight_working_hours ?? true,
  })

  const [validationError, setValidationError] = useState<string | null>(null)

  // Format time for display (remove seconds if present)
  const formatTimeForInput = (time: string) => {
    if (!time) return '09:00'
    return time.substring(0, 5) // Get HH:MM part only
  }

  // Validate working hours
  const validateWorkingHours = (start: string, end: string): boolean => {
    if (!start || !end) {
      setValidationError('Please enter both start and end times')
      return false
    }

    const startTime = new Date(`2000-01-01T${start}`)
    const endTime = new Date(`2000-01-01T${end}`)

    if (startTime >= endTime) {
      setValidationError('End time must be after start time')
      return false
    }

    setValidationError(null)
    return true
  }

  // Handle time change
  const handleTimeChange = (field: 'start' | 'end', value: string) => {
    const newHours = { ...workingHours, [field]: value }
    setWorkingHours(newHours)

    if (validateWorkingHours(
      field === 'start' ? value : workingHours.start,
      field === 'end' ? value : workingHours.end
    )) {
      updatePreferences({
        [`working_hours_${field}`]: value + ':00', // Add seconds for database
      })
    }
  }

  // Handle day toggle
  const handleDayToggle = (day: number) => {
    const newDays = workingHours.days.includes(day)
      ? workingHours.days.filter(d => d !== day)
      : [...workingHours.days, day].sort((a, b) => a - b)
    
    setWorkingHours({ ...workingHours, days: newDays })
    updatePreferences({ working_days: newDays })
  }

  // Handle timezone change
  const handleTimezoneChange = (timezone: string) => {
    setWorkingHours({ ...workingHours, timezone })
    updatePreferences({ timezone })
  }

  // Handle highlight toggle
  const handleHighlightToggle = (enabled: boolean) => {
    setWorkingHours({ ...workingHours, highlightEnabled: enabled })
    updatePreferences({ highlight_working_hours: enabled })
  }

  // Quick presets
  const applyPreset = (preset: 'standard' | 'early' | 'late' | 'flexible') => {
    let newHours = { ...workingHours }
    
    switch (preset) {
      case 'standard':
        newHours = {
          ...newHours,
          start: '09:00',
          end: '18:00',
          days: [1, 2, 3, 4, 5], // Mon-Fri
        }
        break
      case 'early':
        newHours = {
          ...newHours,
          start: '07:00',
          end: '15:00',
          days: [1, 2, 3, 4, 5],
        }
        break
      case 'late':
        newHours = {
          ...newHours,
          start: '11:00',
          end: '20:00',
          days: [1, 2, 3, 4, 5],
        }
        break
      case 'flexible':
        newHours = {
          ...newHours,
          start: '10:00',
          end: '19:00',
          days: [1, 2, 3, 4], // Mon-Thu (4-day work week)
        }
        break
    }
    
    setWorkingHours(newHours)
    updatePreferences({
      working_hours_start: newHours.start + ':00',
      working_hours_end: newHours.end + ':00',
      working_days: newHours.days,
    })
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-700" />
          <h3 className="text-lg font-medium text-gray-900">Working Hours</h3>
        </div>
        
        <Switch
          checked={workingHours.highlightEnabled}
          onCheckedChange={handleHighlightToggle}
          aria-label="Enable working hours highlight"
        />
      </div>

      <p className="text-sm text-gray-600 mb-6">
        Configure your working hours to highlight them in the calendar Day View. 
        Non-working hours will appear muted for better focus.
      </p>

      {/* Quick Presets */}
      <div className="mb-6">
        <Label className="text-sm font-medium mb-2 block">Quick Presets</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => applyPreset('standard')}
            className="text-xs"
          >
            Standard (9-6)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => applyPreset('early')}
            className="text-xs"
          >
            Early (7-3)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => applyPreset('late')}
            className="text-xs"
          >
            Late (11-8)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => applyPreset('flexible')}
            className="text-xs"
          >
            4-Day Week
          </Button>
        </div>
      </div>

      {/* Time Selection */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <Label htmlFor="start-time" className="text-sm font-medium mb-1 block">
            Start Time
          </Label>
          <Input
            id="start-time"
            type="time"
            value={formatTimeForInput(workingHours.start)}
            onChange={(e) => handleTimeChange('start', e.target.value)}
            disabled={!workingHours.highlightEnabled}
            className="w-full"
          />
        </div>
        <div>
          <Label htmlFor="end-time" className="text-sm font-medium mb-1 block">
            End Time
          </Label>
          <Input
            id="end-time"
            type="time"
            value={formatTimeForInput(workingHours.end)}
            onChange={(e) => handleTimeChange('end', e.target.value)}
            disabled={!workingHours.highlightEnabled}
            className="w-full"
          />
        </div>
      </div>

      {validationError && (
        <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {validationError}
        </div>
      )}

      {/* Working Days */}
      <div className="mb-6">
        <Label className="text-sm font-medium mb-2 block">Working Days</Label>
        <div className="grid grid-cols-7 gap-2">
          {DAYS_OF_WEEK.map((day) => (
            <div
              key={day.value}
              className="flex flex-col items-center"
            >
              <Checkbox
                id={`day-${day.value}`}
                checked={workingHours.days.includes(day.value)}
                onCheckedChange={() => handleDayToggle(day.value)}
                disabled={!workingHours.highlightEnabled}
                className="mb-1"
              />
              <Label
                htmlFor={`day-${day.value}`}
                className={cn(
                  "text-xs cursor-pointer",
                  !workingHours.highlightEnabled && "opacity-50"
                )}
              >
                {day.short}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Timezone */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Label htmlFor="timezone" className="text-sm font-medium">
            Timezone
          </Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3 h-3 text-gray-400" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  Your timezone affects how working hours are displayed across different calendar views
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Select
          value={workingHours.timezone}
          onValueChange={handleTimezoneChange}
          disabled={!workingHours.highlightEnabled}
        >
          <SelectTrigger id="timezone" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIMEZONES.map((tz) => (
              <SelectItem key={tz.value} value={tz.value}>
                {tz.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      <div className="p-3 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-700">
          <span className="font-medium">Current Schedule:</span>{' '}
          {workingHours.highlightEnabled ? (
            <>
              {formatTimeForInput(workingHours.start)} - {formatTimeForInput(workingHours.end)}{' '}
              on {workingHours.days.length === 7 
                ? 'every day' 
                : workingHours.days.length === 0
                ? 'no days selected'
                : workingHours.days
                    .map(d => DAYS_OF_WEEK.find(day => day.value === d)?.short)
                    .join(', ')}
            </>
          ) : (
            'Working hours highlighting is disabled'
          )}
        </p>
      </div>
    </div>
  )
}