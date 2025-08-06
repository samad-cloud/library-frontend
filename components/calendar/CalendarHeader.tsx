'use client'

import { ChevronLeft, ChevronRight, Plus, RefreshCw } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface CalendarHeaderProps {
  currentDate: Date
  navigateToPreviousMonth: () => void
  navigateToNextMonth: () => void
  navigateToToday: () => void
  openCampaignModal: () => void
  onRefresh: () => void
  isRefreshing?: boolean
}

export default function CalendarHeader({
  currentDate,
  navigateToPreviousMonth,
  navigateToNextMonth,
  navigateToToday,
  openCampaignModal,
  onRefresh,
  isRefreshing = false,
}: CalendarHeaderProps) {
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  return (
    <div className="bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={navigateToPreviousMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h3 className="text-lg font-semibold text-gray-900">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h3>
          <Button variant="ghost" size="sm" onClick={navigateToNextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={navigateToToday}>
          Today
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onRefresh}
          disabled={isRefreshing}
          className={isRefreshing ? 'opacity-50' : ''}
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
          Sync Jira
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Select defaultValue="month">
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Month</SelectItem>
            <SelectItem value="week">Week</SelectItem>
            <SelectItem value="day">Day</SelectItem>
          </SelectContent>
        </Select>
        <Button className="bg-pink-500 hover:bg-pink-600 text-white" onClick={openCampaignModal}>
          <Plus className="w-4 h-4 mr-2" />
          New Campaign
        </Button>
      </div>
    </div>
  )
}