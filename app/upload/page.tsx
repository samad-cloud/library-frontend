import { createClient } from '@/utils/supabase/server'
import Upload from '@/components/upload/Upload'
import AppLayout from '@/components/shared/AppLayout'

export default async function UploadPage() {
  const supabase = await createClient()
  
  // Try to get user, but don't redirect if not authenticated
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <AppLayout>
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Knowledge Base Upload
          </h1>
          <p className="text-muted-foreground">
            {user ? 'Upload documents and files to enhance AI generation context' : 'Learn about our knowledge base capabilities'}
          </p>
          {!user && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 Want to upload and manage your own knowledge base?{' '}
                <a href="/auth/login" className="font-medium underline hover:no-underline">
                  Sign in to get started
                </a>
              </p>
            </div>
          )}
        </div>
        
        <Upload isAuthenticated={!!user} />
      </div>
    </AppLayout>
  )
}
