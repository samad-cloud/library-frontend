'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface TechPreferencesProps {
  triggerTiming: string
  onTriggerTimingChange: (timing: string) => void
}

export default function TechPreferences({ triggerTiming, onTriggerTimingChange }: TechPreferencesProps) {
  // Convert timing to select value format
  const getSelectValue = (timing: string) => {
    switch (timing) {
      case '2 days':
        return '2-days'
      case '3 days':
        return '3-days'
      case '1 week':
        return '1-week'
      case '2 weeks':
        return '2-weeks'
      default:
        return '2-days'
    }
  }

  // Convert select value back to timing format
  const handleTimingChange = (value: string) => {
    switch (value) {
      case '2-days':
        onTriggerTimingChange('2 days')
        break
      case '3-days':
        onTriggerTimingChange('3 days')
        break
      case '1-week':
        onTriggerTimingChange('1 week')
        break
      case '2-weeks':
        onTriggerTimingChange('2 weeks')
        break
      default:
        onTriggerTimingChange('2 days')
    }
  }

  return (
    <div className="mb-8">
      <h3 className="text-lg font-medium text-gray-900 mb-4">🧠 Tech Preferences</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Trigger Timing</label>
          <Select value={getSelectValue(triggerTiming)} onValueChange={handleTimingChange}>
            <SelectTrigger className="w-48 rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2-days">2 days before</SelectItem>
              <SelectItem value="3-days">3 days before</SelectItem>
              <SelectItem value="1-week">1 week before</SelectItem>
              <SelectItem value="2-weeks">2 weeks before</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}