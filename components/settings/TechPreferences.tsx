'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function TechPreferences() {
  return (
    <div className="mb-8">
      <h3 className="text-lg font-medium text-gray-900 mb-4">🧠 Tech Preferences</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Trigger Timing</label>
          <Select defaultValue="2-days">
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