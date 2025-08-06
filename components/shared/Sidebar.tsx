'use client'

import { LayoutDashboard, Calendar, Zap, Edit, Library, Upload, Settings } from 'lucide-react'

interface SidebarProps {
  currentPage: string
  setCurrentPage: (page: string) => void
}

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

export default function Sidebar({ currentPage, setCurrentPage }: SidebarProps) {
  return (
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

        {/* Public Links */}
        <div className="mt-8">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">PUBLIC</h3>
          <ul className="space-y-2">
            <li>
              <a
                href="/library"
                className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Library className="w-4 h-4" />
                Public Library
              </a>
            </li>
          </ul>
        </div>
      </nav>
    </div>
  )
}