'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Password must be at least 8 characters')
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

export async function resetPassword(formData: FormData) {
  const supabase = await createClient()
  
  try {
    const validatedData = resetPasswordSchema.parse({
      password: formData.get('password'),
      confirmPassword: formData.get('confirmPassword')
    })
    
    const { error } = await supabase.auth.updateUser({
      password: validatedData.password
    })
    
    if (error) {
      redirect(`/auth/error?message=${encodeURIComponent(error.message)}`)
    }
    
    // Sign out after password reset for security
    await supabase.auth.signOut()
    
    redirect('/auth/login?message=' + encodeURIComponent('Password reset successful. Please login with your new password.'))
  } catch (error) {
    if (error instanceof z.ZodError) {
      redirect(`/auth/error?message=${encodeURIComponent(error.errors[0].message)}`)
    }
    redirect(`/auth/error?message=${encodeURIComponent('An unexpected error occurred')}`)
  }
}