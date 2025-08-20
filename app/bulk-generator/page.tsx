import { createClient } from '@/utils/supabase/server'
import BulkGenerator from '@/components/bulk-generator/BulkGenerator'
import AppLayout from '@/components/shared/AppLayout'

export default async function BulkGeneratorPage() {
  const supabase = await createClient()
  
  // Try to get user, but don't redirect if not authenticated
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <AppLayout>
      <BulkGenerator isAuthenticated={!!user} />
    </AppLayout>
  )
}
