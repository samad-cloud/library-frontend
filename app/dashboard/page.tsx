import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/auth/login')
  }

  // Fetch user data from your Users table
  const { data: userData, error: userError } = await supabase
    .from('Users')
    .select(`
      *,
      Organizations (
        name,
        plan
      )
    `)
    .eq('id', user.id)
    .single()

  if (userError) {
    console.error('Error fetching user data:', userError)
    return <div>Error loading user data</div>
  }

  return (
    <div>
      <h1>Welcome, {userData.name}</h1>
      <p>Organization: {userData.Organizations.name}</p>
      <p>Plan: {userData.Organizations.plan}</p>
      <p>Role: {userData.role}</p>
      
      {/* Add your dashboard content here */}
    </div>
  )
}