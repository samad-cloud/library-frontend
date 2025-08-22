import { createClient } from '@/utils/supabase/server'
import Generator from '@/components/generator/Generator'
import AppLayout from '@/components/shared/AppLayout'

export default async function GeneratorPage() {
  const supabase = await createClient()
  
  // Try to get user, but don't redirect if not authenticated
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <AppLayout>
      <div className="p-6">
        {!user && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 Want to save and organize your generated images?{' '}
              <a href="/auth/login" className="font-medium underline hover:no-underline">
                Sign in to get started
              </a>
            </p>
          </div>
        )}
        
        <Generator isAuthenticated={!!user} />
      </div>
    </AppLayout>
  )
}
