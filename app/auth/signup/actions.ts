'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const userData = {
    name: formData.get('name') as string,
    organization_name: formData.get('organization_name') as string,
  }

  // First create the user authentication
  const { data: { user }, error: authError } = await supabase.auth.signUp(data)

  if (authError) {
    console.error('Auth error:', authError)
    redirect('/auth/error')
  }

  if (user) {
    try {
      // First create the organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: userData.organization_name,
          plan: 'free', // Default plan
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (orgError) throw orgError

      // Then create the user record with organization link
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          org_id: org.id,
          email: user.email,
          name: userData.name,
          role: 'admin', // First user of org is admin
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_login: new Date().toISOString()
        })

      if (userError) throw userError

      // // Create default user settings
      // const { error: settingsError } = await supabase
      //   .from('UserSettings')
      //   .insert({
      //     user_id: user.id,
      //     key: 'preferences',
      //     value: JSON.stringify({
      //       theme: 'light',
      //       notifications: true
      //     }),
      //     updated_at: new Date().toISOString()
      //   })

      // if (settingsError) throw settingsError

    } catch (error) {
      console.error('Database error:', error)
      // You might want to handle this differently, possibly cleaning up the auth user
      redirect('/auth/error')
    }
  }

  revalidatePath('/', 'layout')
  redirect('/auth/confirm')
}