'use client'

import { useState, useEffect } from 'react'
import { LogOut, Save } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
// import { useAuth } from '@/contexts/AuthContext' // Temporarily disabled
import { Button } from "@/components/ui/button"
import TechPreferences from './TechPreferences'
import CreativePreferences from './CreativePreferences'
import ApiIntegrations from './ApiIntegrations'
import WorkingHoursSettings from './WorkingHoursSettings'
import JiraModal from '@/components/modals/JiraModal'
import { UserPreferences, StyleType } from '@/types/preferences'

export default function Settings() {
  const [showJiraModal, setShowJiraModal] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [isLoading, setIsLoading] = useState(true)
  
  // Preference states
  const [preferences, setPreferences] = useState<UserPreferences>({
    trigger_timing: '2 days',
    styles: ['Lifestyle + Subject'] as StyleType[],
    number_of_variations: 1,
  })

  const router = useRouter()
  const supabase = createClient()
  // const { user, signOut } = useAuth() // Temporarily disabled

  // Load existing preferences when user is available
  useEffect(() => {
    loadUserPreferences()
  }, [])

  const loadUserPreferences = async () => {
    try {
      setIsLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return

      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', session.user.id)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error loading preferences:', error)
        return
      }

      if (data) {
        setPreferences({
          id: data.id,
          user_id: data.user_id,
          trigger_timing: data.trigger_timing,
          styles: data.styles,
          number_of_variations: data.number_of_variations,
          working_hours_start: data.working_hours_start,
          working_hours_end: data.working_hours_end,
          working_days: data.working_days,
          timezone: data.timezone,
          highlight_working_hours: data.highlight_working_hours,
          custom_schedule: data.custom_schedule,
          created_at: data.created_at,
          updated_at: data.updated_at,
        })
      }
    } catch (error) {
      console.error('Error loading user preferences:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const saveUserPreferences = async () => {
    try {
      setIsSaving(true)
      setSaveStatus('idle')
      
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        throw new Error('User not authenticated')
      }

      const preferencesData = {
        user_id: session.user.id,
        trigger_timing: preferences.trigger_timing,
        styles: preferences.styles,
        number_of_variations: preferences.number_of_variations,
        working_hours_start: preferences.working_hours_start,
        working_hours_end: preferences.working_hours_end,
        working_days: preferences.working_days,
        timezone: preferences.timezone,
        highlight_working_hours: preferences.highlight_working_hours,
        custom_schedule: preferences.custom_schedule,
      }

      const { data, error } = await supabase
        .from('user_preferences')
        .upsert(preferencesData, { 
          onConflict: 'user_id',
          ignoreDuplicates: false 
        })
        .select()
        .single()

      if (error) {
        console.error('Error saving preferences:', error)
        setSaveStatus('error')
        return
      }

      if (data) {
        setPreferences(prev => ({ ...prev, ...data }))
      }
      
      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 3000) // Clear success message after 3 seconds
      
    } catch (error) {
      console.error('Error saving user preferences:', error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 5000) // Clear error message after 5 seconds
    } finally {
      setIsSaving(false)
    }
  }

  const updatePreferences = (updates: Partial<UserPreferences>) => {
    setPreferences(prev => ({ ...prev, ...updates }))
  }

  const toggleSettingsStyle = (style: string) => {
    const currentStyles = preferences.styles as string[]
    const newStyles = currentStyles.includes(style) 
      ? currentStyles.filter((s) => s !== style)
      : [...currentStyles, style]
    
    updatePreferences({ styles: newStyles as StyleType[] })
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

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
          <span className="ml-2 text-gray-600">Loading preferences...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-8xl">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-semibold text-gray-900">Settings</h2>
          <div className="flex items-center gap-3">
            {/* Save Status */}
            {saveStatus === 'success' && (
              <span className="text-sm text-green-600 flex items-center gap-1">
                ✓ Settings saved successfully
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="text-sm text-red-600 flex items-center gap-1">
                ✗ Failed to save settings
              </span>
            )}
            
            {/* Save Button */}
            <Button
              onClick={saveUserPreferences}
              disabled={isSaving}
              className="bg-pink-600 hover:bg-pink-700 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Settings'}
            </Button>
            
            {/* Logout Button */}
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
        </div>

        <TechPreferences 
          triggerTiming={preferences.trigger_timing}
          onTriggerTimingChange={(timing) => updatePreferences({ trigger_timing: timing })}
        />
        <CreativePreferences
          selectedStyles={preferences.styles as string[]}
          toggleSettingsStyle={toggleSettingsStyle}
          numberOfVariations={preferences.number_of_variations}
          onNumberOfVariationsChange={(count) => updatePreferences({ number_of_variations: count })}
        />
        <WorkingHoursSettings
          preferences={preferences}
          updatePreferences={updatePreferences}
        />
        
        {/* Add spacing between sections */}
        <div className="mt-6" />
        
        <ApiIntegrations setShowJiraModal={setShowJiraModal} />
      </div>

      {showJiraModal && <JiraModal onClose={() => setShowJiraModal(false)} />}
    </div>
  )
}