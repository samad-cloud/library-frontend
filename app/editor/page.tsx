import { createClient } from '@/utils/supabase/server'
import ImageEditorClient from '@/components/editor/ImageEditorClient'
import ResponsiveAppLayout from '@/components/shared/ResponsiveAppLayout'

export default async function ImageEditorPage() {
  const supabase = await createClient()
  
  // Try to get user, but don't redirect if not authenticated
  const { data: { user } } = await supabase.auth.getUser()
  return (
    <ResponsiveAppLayout user={user ? { email: user.email, name: user.user_metadata?.name } : undefined}>
      <div className="h-full flex flex-col overflow-hidden">
        {!user && (
          <div className="p-4 bg-blue-50 border-b border-blue-200 flex-shrink-0">
            <p className="text-sm text-blue-800">
              💡 Want to save your editing sessions and access advanced features?{' '}
              <a href="/auth/login" className="font-medium underline hover:no-underline">
                Sign in to get started
              </a>
            </p>
          </div>
        )}
        
        <div className="flex-1 min-h-0">
          <ImageEditorClient isAuthenticated={!!user} />
        </div>
      </div>
    </ResponsiveAppLayout>
  )
}