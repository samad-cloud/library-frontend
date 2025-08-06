'use client'

import { Button } from "@/components/ui/button"

export default function Generator() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold text-gray-900 mb-8">Generator</h2>
      <div className="max-w-2xl">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Campaign</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Name</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="Enter campaign name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                rows={3}
                placeholder="Describe your campaign"
              />
            </div>
            <Button className="bg-pink-500 hover:bg-pink-600 text-white rounded-lg">
              Generate Campaign
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}