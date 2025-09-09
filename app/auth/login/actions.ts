'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters')
})

export async function login(formData: FormData) {
  const supabase = await createClient()

  try {
    // Validate input data
    const validatedData = loginSchema.parse({
      email: formData.get('email'),
      password: formData.get('password')
    })

    const { data: { user }, error } = await supabase.auth.signInWithPassword({
      email: validatedData.email,
      password: validatedData.password,
    })

    if (error) {
      redirect(`/auth/error?message=${encodeURIComponent(error.message)}`)
    }

  // After successful login, create/update user record in your Users table
  const { error: userError } = await supabase
    .from('users')
    .upsert({
      id: user?.id,
      email: user?.email,
      last_login: new Date().toISOString(),
      is_active: true,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'id'
    })

  if (userError) {
    console.error('Error updating user record:', userError)
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
  redirect('/')
}