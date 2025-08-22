'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function resendVerificationEmail(formData: FormData) {
  const supabase = await createClient()
  
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      redirect('/auth/login')
    }

    // Resend verification email
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.email!,
    })
    
    if (error) {
      redirect(`/auth/error?message=${encodeURIComponent(error.message)}`)
    }
    
    // Success - the page will show a success message
    return { success: true }
  } catch (error) {
    redirect(`/auth/error?message=${encodeURIComponent('Failed to resend verification email')}`)
  }
}