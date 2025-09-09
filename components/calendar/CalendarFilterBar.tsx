import React, { useState } from "react"
import { Search, Filter, Calendar, ChevronDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

export interface FilterOptions {
  search: string
  statuses: string[]
  sources: string[]
  dateRange: 'all' | 'today' | 'week' | 'month' | 'custom'
  customStartDate?: Date
  customEndDate?: Date
}

interface CalendarFilterBarProps {
  filters: FilterOptions
  onFiltersChange: (filters: FilterOptions) => void
  availableStatuses?: string[]
  availableSources?: string[]
  className?: string
}

const defaultStatuses = ['pending', 'processing', 'completed', 'failed']
const defaultSources = ['manual', 'calendar', 'jira', 'api']

const dateRangeOptions = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'custom', label: 'Custom Range' },
]

export function CalendarFilterBar({
  filters,
  onFiltersChange,
  availableStatuses = defaultStatuses,
  availableSources = defaultSources,
  className
}: CalendarFilterBarProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  
  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value })
  }

  const handleStatusToggle = (status: string) => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter(s => s !== status)
      : [...filters.statuses, status]
    onFiltersChange({ ...filters, statuses: newStatuses })
  }

  const handleSourceToggle = (source: string) => {
    const newSources = filters.sources.includes(source)
      ? filters.sources.filter(s => s !== source)
      : [...filters.sources, source]
    onFiltersChange({ ...filters, sources: newSources })
  }

  const handleDateRangeChange = (range: FilterOptions['dateRange']) => {
    onFiltersChange({ ...filters, dateRange: range })
  }

  const clearAllFilters = () => {
    onFiltersChange({
      search: '',
      statuses: [],
      sources: [],
      dateRange: 'all',
      customStartDate: undefined,
      customEndDate: undefined
    })
  }

  const activeFilterCount = 
    (filters.search ? 1 : 0) +
    filters.statuses.length +
    filters.sources.length +
    (filters.dateRange !== 'all' ? 1 : 0)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'processing':
        return 'bg-violet-100 text-violet-800 border-violet-200'
      case 'completed':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className={cn("bg-white rounded-lg border shadow-sm", className)}>
      <div className="p-3 space-y-3">
        {/* Search and main filters */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className={cn(
            "flex-1 relative transition-all",
            isSearchFocused && "ring-2 ring-blue-500 rounded-lg"
          )}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search events..."
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              className="pl-9 pr-8 h-9 text-sm border-gray-200"
            />
            {filters.search && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-3 h-3 text-gray-500" />
              </button>
            )}
          </div>

          {/* Status filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <Filter className="w-3.5 h-3.5 mr-1.5" />
                Status
                {filters.statuses.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 px-1 py-0 text-xs">
                    {filters.statuses.length}
                  </Badge>
                )}
                <ChevronDown className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {availableStatuses.map(status => (
                <DropdownMenuCheckboxItem
                  key={status}
                  checked={filters.statuses.includes(status)}
                  onCheckedChange={() => handleStatusToggle(status)}
                >
                  <div className="flex items-center gap-2 w-full">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      status === 'pending' && "bg-amber-500",
                      status === 'processing' && "bg-violet-500",
                      status === 'completed' && "bg-emerald-500",
                      status === 'failed' && "bg-red-500"
                    )} />
                    <span className="capitalize">{status}</span>
                  </div>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Source filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <Calendar className="w-3.5 h-3.5 mr-1.5" />
                Source
                {filters.sources.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 px-1 py-0 text-xs">
                    {filters.sources.length}
                  </Badge>
                )}
                <ChevronDown className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel>Filter by Source</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {availableSources.map(source => (
                <DropdownMenuCheckboxItem
                  key={source}
                  checked={filters.sources.includes(source)}
                  onCheckedChange={() => handleSourceToggle(source)}
                >
                  <span className="capitalize">{source}</span>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Date range filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <Calendar className="w-3.5 h-3.5 mr-1.5" />
                {dateRangeOptions.find(opt => opt.value === filters.dateRange)?.label || 'All Time'}
                <ChevronDown className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel>Date Range</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {dateRangeOptions.map(option => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => handleDateRangeChange(option.value as FilterOptions['dateRange'])}
                >
                  {option.label}
                  {filters.dateRange === option.value && (
                    <span className="ml-auto text-blue-600">✓</span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Clear filters */}
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-9 text-gray-500 hover:text-gray-700"
            >
              Clear all
              <Badge variant="secondary" className="ml-1.5 px-1 py-0 text-xs">
                {activeFilterCount}
              </Badge>
            </Button>
          )}
        </div>

        {/* Active filters display */}
        {(filters.search || filters.statuses.length > 0 || filters.sources.length > 0 || filters.dateRange !== 'all') && (
          <div className="flex flex-wrap gap-1.5">
            {filters.search && (
              <Badge variant="secondary" className="text-xs">
                Search: {filters.search}
                <button
                  onClick={() => handleSearchChange('')}
                  className="ml-1 hover:text-gray-700"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {filters.statuses.map(status => (
              <Badge
                key={status}
                className={cn("text-xs border", getStatusColor(status))}
              >
                {status}
                <button
                  onClick={() => handleStatusToggle(status)}
                  className="ml-1 hover:opacity-70"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            {filters.sources.map(source => (
              <Badge
                key={source}
                variant="outline"
                className="text-xs"
              >
                {source}
                <button
                  onClick={() => handleSourceToggle(source)}
                  className="ml-1 hover:text-gray-700"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            {filters.dateRange !== 'all' && (
              <Badge variant="outline" className="text-xs">
                {dateRangeOptions.find(opt => opt.value === filters.dateRange)?.label}
                <button
                  onClick={() => handleDateRangeChange('all')}
                  className="ml-1 hover:text-gray-700"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  )
}