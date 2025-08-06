'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import ProductSelector from './ProductSelector'
import StyleSelector from './StyleSelector'

interface Campaign {
  id: string
  name: string
  date: string
  description?: string
  issue_type?: string
  raw_data?: any
  triggerTiming?: string
  details?: string
  region?: string
  products?: string[]
  styles?: string[]
  variations?: number
}

interface CampaignModalProps {
  selectedDate: Date | null
  onClose: () => void
  existingCampaigns: Campaign[]
}

const defaultCampaignForm = {
  name: "",
  details: "",
  region: "",
  products: [] as string[],
  date: "",
  generationMode: "auto",
  triggerTiming: "2-days",
  styles: [] as string[],
  variations: 1,
  saveDestination: "library",
}

export default function CampaignModal({ selectedDate, onClose, existingCampaigns }: CampaignModalProps) {
  const dateString = selectedDate?.toISOString().split("T")[0] || ""
  const existingCampaign = existingCampaigns.find((c) => c.date === dateString)
  
  const [campaignForm, setCampaignForm] = useState(
    existingCampaign
      ? {
          ...defaultCampaignForm,
          ...existingCampaign,
        }
      : {
          ...defaultCampaignForm,
          date: dateString,
        }
  )

  const handleSubmit = () => {
    console.log(existingCampaign ? "Updating campaign:" : "Creating campaign:", campaignForm)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">
              {existingCampaign ? "Edit Campaign" : "New Campaign"}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Campaign Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Name</label>
              <input
                type="text"
                value={campaignForm.name}
                onChange={(e) => setCampaignForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="Enter campaign name"
              />
            </div>

            {/* Campaign Details */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Details</label>
              <textarea
                value={campaignForm.details}
                onChange={(e) => setCampaignForm((prev) => ({ ...prev, details: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                rows={3}
                placeholder="Describe the purpose or details of this campaign"
              />
            </div>

            {/* Region */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Region</label>
              <Select
                value={campaignForm.region}
                onValueChange={(value) => setCampaignForm((prev) => ({ ...prev, region: value }))}
              >
                <SelectTrigger className="w-full rounded-lg">
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">US</SelectItem>
                  <SelectItem value="UK">UK</SelectItem>
                  <SelectItem value="Netherlands">Netherlands</SelectItem>
                  <SelectItem value="Spain">Spain</SelectItem>
                  <SelectItem value="France">France</SelectItem>
                  <SelectItem value="Germany">Germany</SelectItem>
                  <SelectItem value="Italy">Italy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Products */}
            <ProductSelector
              selectedProducts={campaignForm.products || []}
              onProductsChange={(products) => setCampaignForm((prev) => ({ ...prev, products }))}
            />

            {/* Campaign Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Date</label>
              <input
                type="date"
                value={campaignForm.date}
                onChange={(e) => setCampaignForm((prev) => ({ ...prev, date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>

            {/* Trigger Timing */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Trigger Timing</label>
              <Select
                value={campaignForm.triggerTiming}
                onValueChange={(value) => setCampaignForm((prev) => ({ ...prev, triggerTiming: value }))}
              >
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

            {/* Styles */}
            <StyleSelector
              selectedStyles={campaignForm.styles || []}
              onStylesChange={(styles) => setCampaignForm((prev) => ({ ...prev, styles }))}
            />

            {/* Number of Variations */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Number of Variations</label>
              <Select
                value={campaignForm.variations.toString()}
                onValueChange={(value) =>
                  setCampaignForm((prev) => ({ ...prev, variations: Number.parseInt(value) }))
                }
              >
                <SelectTrigger className="w-24 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200">
            <Button
              className="flex-1 bg-pink-500 hover:bg-pink-600 text-white rounded-lg"
              onClick={handleSubmit}
              disabled={!campaignForm.name || !campaignForm.date}
            >
              {existingCampaign ? "Update Campaign" : "Create Campaign"}
            </Button>
            <Button
              variant="outline"
              className="flex-1 rounded-lg bg-transparent"
              onClick={onClose}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}