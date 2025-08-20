import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Settings from '@/components/settings/Settings'
import AppLayout from '@/components/shared/AppLayout'

export default async function SettingsPage() {
  const supabase = await createClient()
  
  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  return (
    <AppLayout>
      <div className="p-6">
        <Settings />
      </div>
    </AppLayout>
  )
}
