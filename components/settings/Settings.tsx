'use client'

import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import TechPreferences from './TechPreferences'
import CreativePreferences from './CreativePreferences'
import ApiIntegrations from './ApiIntegrations'
import JiraModal from '@/components/modals/JiraModal'

export default function Settings() {
  const [showJiraModal, setShowJiraModal] = useState(false)
  const [selectedSettingsStyles, setSelectedSettingsStyles] = useState<string[]>(["Lifestyle + Subject"])
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const toggleSettingsStyle = (style: string) => {
    setSelectedSettingsStyles((prev) =>
      prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]
    )
  }

  async function handleLogout() {
    try {
      setIsLoggingOut(true)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      router.push('/auth/login')
    } catch (err) {
      console.error('Error logging out:', err)
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="p-6">
      <div className="max-w-8xl">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-semibold text-gray-900">Settings</h2>
          <Button
            variant="outline"
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            {isLoggingOut ? 'Logging out...' : 'Log out'}
          </Button>
        </div>

        <TechPreferences />
        <CreativePreferences
          selectedStyles={selectedSettingsStyles}
          toggleSettingsStyle={toggleSettingsStyle}
        />
        <ApiIntegrations setShowJiraModal={setShowJiraModal} />
      </div>

      {showJiraModal && <JiraModal onClose={() => setShowJiraModal(false)} />}
    </div>
  )
}