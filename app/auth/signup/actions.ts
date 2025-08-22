'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { z } from 'zod'

const signupSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  organization_name: z.string().min(2, 'Organization name required')
})

export async function signup(formData: FormData) {
  const supabase = await createClient()

  try {
    // Validate input data
    const validatedData = signupSchema.parse({
      email: formData.get('email'),
      password: formData.get('password'),
      name: formData.get('name'),
      organization_name: formData.get('organization_name')
    })

    // First create the user authentication
    const { data: { user }, error: authError } = await supabase.auth.signUp({
      email: validatedData.email,
      password: validatedData.password
    })

    if (authError) {
      console.error('Auth error:', authError)
      redirect(`/auth/error?message=${encodeURIComponent(authError.message)}`)
    }

  if (user) {
    try {
      // First create the organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: validatedData.organization_name,
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
          name: validatedData.name,
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
      redirect(`/auth/error?message=${encodeURIComponent('Failed to create user profile')}`)
    }
  }

  } catch (error) {
    if (error instanceof z.ZodError) {
      // Handle validation errors
      redirect(`/auth/error?message=${encodeURIComponent(error.errors[0].message)}`)
    }
    // Handle other errors
    redirect(`/auth/error?message=${encodeURIComponent('An unexpected error occurred')}`)
  }

  revalidatePath('/', 'layout')
  redirect('/auth/confirm')
}