import { createClient } from '@/utils/supabase/client'

// Singleton Supabase client to prevent multiple instances
let supabaseClient: ReturnType<typeof createClient> | null = null

export function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createClient()
  }
  return supabaseClient
}

// For cases where you specifically need a fresh client
export function createFreshClient() {
  return createClient()
}
