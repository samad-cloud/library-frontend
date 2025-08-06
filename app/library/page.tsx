import { createClient } from '@/utils/supabase/server'
import Library from '@/components/library/Library'

export default async function LibraryPage() {
  const supabase = await createClient()

  // Try to get user, but don't redirect if not authenticated
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Image Library
          </h1>
          <p className="text-muted-foreground">
            {user ? 'Your generated images and campaigns' : 'Browse our collection of AI-generated images'}
          </p>
          {!user && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 Want to create your own images?{' '}
                <a href="/auth/login" className="font-medium underline hover:no-underline">
                  Sign in to get started
                </a>
              </p>
            </div>
          )}
        </div>
        
        <Library isPublic={!user} />
      </div>
    </div>
  )
} 