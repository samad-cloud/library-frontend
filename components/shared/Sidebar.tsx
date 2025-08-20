'use client'

import { LayoutDashboard, Calendar, Zap, Edit, Library, Upload, Settings, Grid3X3, Code } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface SidebarProps {
  // Remove the state-based navigation props
}

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Calendar, label: "Calendar", href: "/calendar" },
  { icon: Zap, label: "Generator", href: "/generator" },
  { icon: Grid3X3, label: "Bulk Generator", href: "/bulk-generator" },
  { icon: Edit, label: "Editor", href: "/editor" },
  { icon: Library, label: "Library", href: "/library" },
  { icon: Upload, label: "Upload", href: "/upload" },
  { icon: Code, label: "API Test", href: "/api-test" },
  { icon: Settings, label: "Settings", href: "/settings" },
]

const integrations = [
  { name: "Google Calendar", color: "bg-green-500" },
  { name: "Jira", color: "bg-blue-500" },
  { name: "Outlook", color: "bg-orange-500" },
]

export default function Sidebar({}: SidebarProps) {
  const pathname = usePathname()

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <Link href="/dashboard">
          <h1 className="text-xl font-bold text-gray-900 hover:text-pink-600 transition-colors cursor-pointer">
            GeneraPix
          </h1>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {sidebarItems.map((item) => (
            <li key={item.label}>
              <Link
                href={item.href}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  pathname === item.href ? "bg-pink-500 text-white" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
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
  )
}