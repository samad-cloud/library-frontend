/**
 * Utility to check Supabase configuration and environment variables
 * This helps debug connection issues on Vercel deployments
 */

export function checkSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  const config = {
    url: supabaseUrl,
    hasAnonKey: !!supabaseAnonKey,
    // Don't log the actual key for security
    urlValid: supabaseUrl?.includes('supabase.co') || false,
    environment: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV || 'development',
  }

  // Log configuration status (without sensitive data)
  console.log('🔧 Supabase Configuration Check:', {
    hasUrl: !!config.url,
    hasAnonKey: config.hasAnonKey,
    urlValid: config.urlValid,
    environment: config.environment,
    vercelEnv: config.vercelEnv,
  })

  // Check for common issues
  const issues: string[] = []
  
  if (!supabaseUrl) {
    issues.push('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
  }
  
  if (!supabaseAnonKey) {
    issues.push('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
  }
  
  if (supabaseUrl && !config.urlValid) {
    issues.push('NEXT_PUBLIC_SUPABASE_URL does not appear to be a valid Supabase URL')
  }

  if (issues.length > 0) {
    console.error('❌ Supabase Configuration Issues:', issues)
    return { valid: false, issues }
  }

  console.log('✅ Supabase configuration appears valid')
  return { valid: true, issues: [] }
}

export function logConnectionAttempt(context: string) {
  console.log(`🔌 Attempting Supabase connection from: ${context}`)
  return checkSupabaseConfig()
}
