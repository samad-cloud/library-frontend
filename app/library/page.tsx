import { createClient } from '@/utils/supabase/server'
import EnhancedLibrary from '@/components/library/EnhancedLibrary'
import AppLayout from '@/components/shared/AppLayout'

export default async function LibraryPage() {
  const supabase = await createClient()

  // Try to get user, but don't redirect if not authenticated
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        <div className="px-6 py-4 bg-white border-b border-gray-200">
          <p className="text-muted-foreground text-sm">
            {user ? 'Your AI-generated images and campaigns' : 'Browse our collection of AI-generated images'}
          </p>
          {!user && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 Want to create your own images?{' '}
                <a href="/auth/login" className="font-medium underline hover:no-underline">
                  Sign in to get started
                </a>
              </p>
            </div>
          )}
        </div>
        
        <EnhancedLibrary isPublic={!user} />
      </div>
    </AppLayout>
  )
} 