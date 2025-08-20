import { createClient } from '@/utils/supabase/server'
import Editor from '@/components/editor/Editor'
import AppLayout from '@/components/shared/AppLayout'

export default async function EditorPage() {
  const supabase = await createClient()
  
  // Try to get user, but don't redirect if not authenticated
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <AppLayout>
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Image Editor
          </h1>
          <p className="text-muted-foreground">
            {user ? 'Edit and enhance your AI-generated images' : 'Experience our image editing capabilities'}
          </p>
          {!user && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 Want to save your edited images?{' '}
                <a href="/auth/login" className="font-medium underline hover:no-underline">
                  Sign in to get started
                </a>
              </p>
            </div>
          )}
        </div>
        
        <Editor isAuthenticated={!!user} />
      </div>
    </AppLayout>
  )
}
