'use client'

import { Search } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, Trash2 } from 'lucide-react'

interface LibraryHeaderProps {
  selectMode: boolean
  setSelectMode: (mode: boolean) => void
  selectedImages: string[]
  isPublic?: boolean
}

export default function LibraryHeader({ selectMode, setSelectMode, selectedImages, isPublic = false }: LibraryHeaderProps) {
  return (
    <div className="bg-white px-6 py-4 border-b border-gray-200">
      <div className="flex flex-col lg:flex-row gap-4 lg:justify-start lg:items-stretch">
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3 flex-1 lg:max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by campaign, tag, product…"
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent w-fit"
            />
          </div>

          <div className="flex gap-2">
            <Select defaultValue="all-campaigns">
              <SelectTrigger className="w-40 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-campaigns">All campaigns</SelectItem>
                <SelectItem value="uk-summer-sale">UK Summer Sale</SelectItem>
                <SelectItem value="winter-collection">Winter Collection</SelectItem>
                <SelectItem value="spring-launch">Spring Launch</SelectItem>
              </SelectContent>
            </Select>

            <Select defaultValue="all-methods">
              <SelectTrigger className="w-32 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-methods">All methods</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="auto">Auto</SelectItem>
                <SelectItem value="api">API</SelectItem>
              </SelectContent>
            </Select>

            <Select defaultValue="newest">
              <SelectTrigger className="w-28 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
                <SelectItem value="a-z">A–Z</SelectItem>
                <SelectItem value="z-a">Z–A</SelectItem>
              </SelectContent>
            </Select>

            {!isPublic && (
              <Button
                variant={selectMode ? "default" : "outline"}
                size="sm"
                className={`rounded-lg ${selectMode ? "bg-pink-500 text-white" : "bg-white"}`}
                onClick={() => setSelectMode(!selectMode)}
              >
                {selectMode ? "Deselect" : "Select"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {!isPublic && selectMode && selectedImages.length > 0 && (
        <div className="mt-4 p-3 bg-pink-50 rounded-lg flex items-center justify-between">
          <span className="text-sm text-gray-700">
            {selectedImages.length} image{selectedImages.length !== 1 ? "s" : ""} selected
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="rounded-lg bg-white">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg bg-white text-red-600 border-red-200 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}