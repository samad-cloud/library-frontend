import { createClient } from '@/utils/supabase/server'
import CalendarPage from '@/components/calendar/CalendarPage'
import AppLayout from '@/components/shared/AppLayout'

export default async function Calendar() {
  const supabase = await createClient()

  // Try to get user, but don't redirect if not authenticated
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <AppLayout>
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Calendar
          </h1>
          <p className="text-muted-foreground">
            {user ? 'Manage your events and deadlines' : 'View calendar events'}
          </p>
          {!user && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 Want to sync your own calendar events?{' '}
                <a href="/auth/login" className="font-medium underline hover:no-underline">
                  Sign in to get started
                </a>
              </p>
            </div>
          )}
        </div>
        
        <CalendarPage isAuthenticated={!!user} />
      </div>
    </AppLayout>
  )
}
