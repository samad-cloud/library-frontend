"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  LayoutDashboard,
  Calendar,
  Zap,
  Edit,
  Library,
  Upload,
  Settings,
  Bell,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Download,
  Trash2,
  Expand,
  X,
} from "lucide-react"

export default function Component() {
  const [currentDate, setCurrentDate] = useState(new Date(2024, 6, 1)) // July 2024
  const [showJiraModal, setShowJiraModal] = useState(false)
  const [currentPage, setCurrentPage] = useState("settings") // Start with settings as shown

  // Add these state variables after the existing useState declarations
  const [showCampaignModal, setShowCampaignModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [campaignForm, setCampaignForm] = useState({
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
  })
  const [selectMode, setSelectMode] = useState(false)
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [selectedImageForPreview, setSelectedImageForPreview] = useState<any>(null)

  // Add state for settings page style selection
  const [selectedSettingsStyles, setSelectedSettingsStyles] = useState<string[]>(["Lifestyle + Subject"])

  const [productInput, setProductInput] = useState("")
  const [showProductSuggestions, setShowProductSuggestions] = useState(false)

  // Add sample campaign data
  const existingCampaigns = [
    {
      id: "uk-summer-sale-2024",
      name: "UK Summer Sale",
      details: "Summer promotional campaign targeting UK market with beach and lifestyle themes",
      region: "UK",
      products: ["photo mug", "photo canvas"],
      date: "2024-07-29", // This matches July 29, 2024
      triggerTiming: "2-days",
      styles: ["Lifestyle + Subject", "Emotionally driven"],
      variations: 2,
      status: "active",
      images: [
        {
          id: "1",
          name: "Summer Beach Scene",
          url: "/placeholder.svg?height=300&width=300",
          alt: "Summer beach scene",
          generatedDate: "2 days ago",
          approved: true,
          favorite: false,
        },
        {
          id: "2",
          name: "Lifestyle Shot",
          url: "/placeholder.svg?height=300&width=300",
          alt: "Lifestyle product shot",
          generatedDate: "3 days ago",
          approved: false,
          favorite: true,
        },
        {
          id: "3",
          name: "Studio Style",
          url: "/placeholder.svg?height=300&width=300",
          alt: "Studio style product",
          generatedDate: "1 week ago",
          approved: true,
          favorite: false,
        },
        {
          id: "4",
          name: "Close-up Detail",
          url: "/placeholder.svg?height=300&width=300",
          alt: "Product close-up",
          generatedDate: "1 week ago",
          approved: false,
          favorite: false,
        },
        {
          id: "5",
          name: "White Background",
          url: "/placeholder.svg?height=300&width=300",
          alt: "White background product",
          generatedDate: "2 weeks ago",
          approved: true,
          favorite: true,
        },
        {
          id: "6",
          name: "Emotional Scene",
          url: "/placeholder.svg?height=300&width=300",
          alt: "Emotional product scene",
          generatedDate: "2 weeks ago",
          approved: false,
          favorite: false,
        },
      ],
    },
  ]

  const productLibrary = ["photo mug", "photo book", "photo canvas", "metal print", "stone slate"]

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  // Generate calendar days for July 2024
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())

    const days = []
    const current = new Date(startDate)

    // Generate 6 weeks of days
    for (let week = 0; week < 6; week++) {
      for (let day = 0; day < 7; day++) {
        days.push(new Date(current))
        current.setDate(current.getDate() + 1)
      }
    }

    return days
  }

  // Add navigation functions
  const navigateToPreviousMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const navigateToNextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const navigateToToday = () => {
    const today = new Date()
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1))
  }

  const addProduct = (product: string) => {
    if (campaignForm.products.length < 3 && !campaignForm.products.includes(product)) {
      setCampaignForm((prev) => ({
        ...prev,
        products: [...prev.products, product],
      }))
    }
    setProductInput("")
    setShowProductSuggestions(false)
  }

  const removeProduct = (productToRemove: string) => {
    setCampaignForm((prev) => ({
      ...prev,
      products: prev.products.filter((p) => p !== productToRemove),
    }))
  }

  const getFilteredProducts = () => {
    return productLibrary.filter(
      (product) =>
        product.toLowerCase().includes(productInput.toLowerCase()) && !campaignForm.products.includes(product),
    )
  }

  const calendarDays = generateCalendarDays()
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]

  const sidebarItems = [
    { icon: LayoutDashboard, label: "Dashboard", page: "dashboard" },
    { icon: Calendar, label: "Calendar", page: "calendar" },
    { icon: Zap, label: "Generator", page: "generator" },
    { icon: Edit, label: "Editor", page: "editor" },
    { icon: Library, label: "Library", page: "library" },
    { icon: Upload, label: "Upload", page: "upload" },
    { icon: Settings, label: "Settings", page: "settings" },
  ]

  const integrations = [
    { name: "Google Calendar", color: "bg-green-500" },
    { name: "Jira", color: "bg-blue-500" },
    { name: "Outlook", color: "bg-orange-500" },
  ]

  const openCampaignModal = (date?: Date) => {
    if (date) {
      setSelectedDate(date)
      const dateString = date.toISOString().split("T")[0]
      console.log("Clicked date:", dateString) // Debug log

      // Check if there's an existing campaign on this date
      const existingCampaign = existingCampaigns.find((campaign) => {
        console.log("Comparing:", campaign.date, "with", dateString) // Debug log
        return campaign.date === dateString
      })

      console.log("Found existing campaign:", existingCampaign) // Debug log

      if (existingCampaign) {
        // Pre-fill form with existing campaign data
        setCampaignForm({
          name: existingCampaign.name,
          details: existingCampaign.details,
          region: existingCampaign.region,
          products: [...existingCampaign.products], // Create a copy
          date: existingCampaign.date,
          generationMode: "auto",
          triggerTiming: existingCampaign.triggerTiming,
          styles: [...existingCampaign.styles], // Create a copy
          variations: existingCampaign.variations,
          saveDestination: "library",
        })
      } else {
        // Reset form for new campaign
        setCampaignForm({
          name: "",
          details: "",
          region: "",
          products: [],
          date: dateString,
          generationMode: "auto",
          triggerTiming: "2-days",
          styles: [],
          variations: 1,
          saveDestination: "library",
        })
      }
    } else {
      setSelectedDate(null)
      setCampaignForm({
        name: "",
        details: "",
        region: "",
        products: [],
        date: "",
        generationMode: "auto",
        triggerTiming: "2-days",
        styles: [],
        variations: 1,
        saveDestination: "library",
      })
    }
    setShowCampaignModal(true)
  }

  const toggleSettingsStyle = (style: string) => {
    setSelectedSettingsStyles((prev) => (prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]))
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">GeneraPix</h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {sidebarItems.map((item) => (
              <li key={item.label}>
                <button
                  onClick={() => setCurrentPage(item.page)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    currentPage === item.page ? "bg-pink-500 text-white" : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </button>
              </li>
            ))}
          </ul>

          {/* Integrations */}
          <div className="mt-8">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">INTEGRATIONS</h3>
            <ul className="space-y-2">
              {integrations.map((integration) => (
                <li key={integration.name} className="flex items-center gap-3 px-3 py-2">
                  <div className={`w-2 h-2 rounded-full ${integration.color}`} />
                  <span className="text-sm text-gray-700">{integration.name}</span>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-semibold text-gray-900 capitalize">{currentPage}</h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Bell className="w-5 h-5 text-gray-500" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
            </div>
            <span className="text-sm text-pink-500 font-medium">Pro Plan</span>
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-pink-500 text-white text-sm">JD</AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto">
          {currentPage === "calendar" && (
            <>
              {/* Calendar Header */}
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
                  <Button className="bg-pink-500 hover:bg-pink-600 text-white" onClick={() => openCampaignModal()}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Campaign
                  </Button>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="bg-white">
                {/* Days of week header */}
                <div className="grid grid-cols-7 border-b border-gray-200">
                  {daysOfWeek.map((day) => (
                    <div
                      key={day}
                      className="p-4 text-center text-sm font-medium text-gray-500 border-r border-gray-200 last:border-r-0"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar days */}
                <div className="grid grid-cols-7">
                  {calendarDays.map((day, index) => {
                    const isCurrentMonth = day.getMonth() === currentDate.getMonth()
                    const dayNumber = day.getDate()
                    const dateString = day.toISOString().split("T")[0]
                    const existingCampaign = existingCampaigns.find((campaign) => campaign.date === dateString)
                    const isEvent = existingCampaign && isCurrentMonth

                    return (
                      <div
                        key={index}
                        className="min-h-24 p-2 border-r border-b border-gray-200 last:border-r-0 relative cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => openCampaignModal(day)}
                      >
                        <span className={`text-sm ${isCurrentMonth ? "text-gray-900" : "text-gray-400"}`}>
                          {dayNumber}
                        </span>

                        {isEvent && existingCampaign && (
                          <div className="mt-1">
                            <div className="bg-gray-100 rounded p-2 text-xs">
                              <div className="flex items-center gap-1 mb-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full" />
                                <span className="font-medium text-gray-900">{existingCampaign.name}</span>
                              </div>
                              <div className="text-gray-500">{existingCampaign.triggerTiming.replace("-", " ")}</div>
                              <div className="text-gray-500">via Google</div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          {currentPage === "settings" && (
            <div className="p-6">
              <div className="max-w-2xl">
                <h2 className="text-2xl font-semibold text-gray-900 mb-8">Settings</h2>

                {/* Tech Preferences Section */}
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

                {/* Creative Preferences Section */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">🎨 Creative Preferences</h3>

                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <label className="text-sm font-medium text-gray-700">Style(s)</label>
                        <div className="group relative">
                          <svg
                            className="w-4 h-4 text-gray-400 cursor-help"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                            <path d="M12 17h.01" />
                          </svg>
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            Select one or more
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-3">
                        {[
                          "Lifestyle no subject",
                          "Lifestyle + Subject",
                          "Emotionally driven",
                          "Studio Style",
                          "Close-up shot",
                          "White background",
                        ].map((style) => (
                          <button
                            key={style}
                            onClick={() => toggleSettingsStyle(style)}
                            className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                              selectedSettingsStyles.includes(style)
                                ? "bg-pink-500 text-white border-pink-500"
                                : "border-gray-300 hover:border-pink-300 hover:bg-pink-50"
                            }`}
                          >
                            {style}
                          </button>
                        ))}
                      </div>

                      <p className="text-xs text-gray-500">Generating multiple styles increases processing time</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Number of Variations</label>
                      <Select defaultValue="1">
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
                </div>

                {/* API Integrations Section */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">🔗 API Integrations</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Jira Integration</label>
                    <Button
                      variant="outline"
                      className="rounded-lg bg-white border-[rgba(236,72,153,1)] text-[rgba(236,72,153,1)]"
                      onClick={() => setShowJiraModal(true)}
                    >
                      Connect
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentPage === "dashboard" && (
            <div className="p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-8">Dashboard</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Active Campaigns</h3>
                  <p className="text-3xl font-bold text-pink-500">12</p>
                </div>
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Generated Images</h3>
                  <p className="text-3xl font-bold text-blue-500">1,247</p>
                </div>
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">API Calls</h3>
                  <p className="text-3xl font-bold text-green-500">8,932</p>
                </div>
              </div>
            </div>
          )}

          {currentPage === "generator" && (
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
                    <Button className="bg-pink-500 hover:bg-pink-600 text-white rounded-lg">Generate Campaign</Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentPage === "editor" && (
            <div className="p-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-8">Editor</h2>
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <p className="text-gray-600">Image editing tools will be available here.</p>
              </div>
            </div>
          )}

          {currentPage === "library" && (
            <div className="flex-1 flex flex-col">
              {/* Library Header */}
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

                      <Button
                        variant={selectMode ? "default" : "outline"}
                        size="sm"
                        className={`rounded-lg ${selectMode ? "bg-pink-500 text-white" : "bg-white"}`}
                        onClick={() => setSelectMode(!selectMode)}
                      >
                        {selectMode ? "Deselect" : "Select"}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Bulk Actions Bar */}
                {selectMode && selectedImages.length > 0 && (
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

              {/* Image Grid Content */}
              <div className="flex-1 p-6 overflow-auto">
                {existingCampaigns.map((campaign) => (
                  <div key={campaign.name} className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">{campaign.name}</h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                      {campaign.images.map((image) => (
                        <div
                          key={image.id}
                          className={`group relative bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow ${
                            selectMode ? "cursor-pointer" : ""
                          } ${selectMode && selectedImages.includes(image.id) ? "ring-2 ring-pink-500" : ""}`}
                          onClick={() => {
                            if (selectMode) {
                              if (selectedImages.includes(image.id)) {
                                setSelectedImages(selectedImages.filter((id) => id !== image.id))
                              } else {
                                setSelectedImages([...selectedImages, image.id])
                              }
                            }
                          }}
                        >
                          {/* Checkbox for select mode */}
                          {selectMode && (
                            <div className="absolute top-2 left-2 z-10">
                              <input
                                type="checkbox"
                                checked={selectedImages.includes(image.id)}
                                onChange={() => {}} // Handled by parent onClick
                                className="w-4 h-4 text-pink-500 border-gray-300 rounded focus:ring-pink-500 pointer-events-none"
                              />
                            </div>
                          )}

                          {/* Image Thumbnail */}
                          <div className="aspect-square bg-gray-100 relative overflow-hidden">
                            <img
                              src={image.url || "/placeholder.svg"}
                              alt={image.alt}
                              className="w-full h-full object-cover"
                            />

                            {/* Expand Icon - only show when not in select mode */}
                            {!selectMode && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedImageForPreview(image)
                                }}
                                className="absolute top-2 right-2 p-1.5 bg-black bg-opacity-50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-opacity-70"
                              >
                                <Expand className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          {/* Image Info */}
                          <div className="p-3">
                            <p className="text-sm font-medium text-gray-900 truncate">{image.name}</p>
                            <p className="text-xs text-gray-500 mt-1">{image.generatedDate}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Image Preview Modal */}
              {selectedImageForPreview && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                  <div className="relative max-w-4xl max-h-full">
                    <button
                      onClick={() => setSelectedImageForPreview(null)}
                      className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>

                    <img
                      src={selectedImageForPreview.url || "/placeholder.svg"}
                      alt={selectedImageForPreview.alt}
                      className="max-w-full max-h-[90vh] object-contain rounded-lg"
                    />

                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4 rounded-b-lg">
                      <h4 className="font-medium">{selectedImageForPreview.name}</h4>
                      <p className="text-sm text-gray-300 mt-1">{selectedImageForPreview.generatedDate}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentPage === "upload" && (
            <div className="p-6">
              <div className="max-w-4xl">
                <h2 className="text-2xl font-semibold text-gray-900 mb-8">Upload</h2>

                {/* Research Uploads Section */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">📘 Research Uploads</h3>

                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    {/* Upload Area */}
                    <div className="mb-6">
                      <div className="bg-gray-50 p-8 rounded-lg border-2 border-dashed border-gray-300 text-center hover:border-gray-400 transition-colors">
                        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-lg font-medium text-gray-900 mb-2">Upload research documents</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
