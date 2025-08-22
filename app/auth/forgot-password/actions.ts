'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format')
})

export async function forgotPassword(formData: FormData) {
  const supabase = await createClient()
  
  try {
    const validatedData = forgotPasswordSchema.parse({
      email: formData.get('email')
    })
    
    const { error } = await supabase.auth.resetPasswordForEmail(validatedData.email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/reset-password`
    })
    
    if (error) {
      redirect(`/auth/error?message=${encodeURIComponent(error.message)}`)
    }
    
    // Always redirect to success page to prevent email enumeration
    redirect('/auth/forgot-password/success')
  } catch (error) {
    if (error instanceof z.ZodError) {
      redirect(`/auth/error?message=${encodeURIComponent(error.errors[0].message)}`)
    }
    redirect(`/auth/error?message=${encodeURIComponent('An unexpected error occurred')}`)
  }
}