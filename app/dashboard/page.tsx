import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import Dashboard from '@/components/dashboard/Dashboard'
import AppLayout from '@/components/shared/AppLayout'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/auth/login')
  }

  return (
    <AppLayout>
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Welcome back! Here's an overview of your activity and projects.
          </p>
        </div>
        
        <Dashboard user={user} />
      </div>
    </AppLayout>
  )
}