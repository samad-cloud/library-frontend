import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Simple in-memory cache for auth results (per-request lifecycle)
const authCache = new Map<string, { user: any; timestamp: number }>()
const CACHE_DURATION = 30 * 1000 // 30 seconds

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Get session token for cache key
  const sessionToken = request.cookies.get('sb-access-token')?.value || 
                      request.cookies.get('sb-refresh-token')?.value || 
                      'anonymous'
  
  const cacheKey = `${sessionToken}-${request.nextUrl.pathname}`
  const cached = authCache.get(cacheKey)
  
  let user: any = null

  // Use cached result if available and not expired
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    user = cached.user
  } else {
    // Only make auth request if not cached or expired
    const {
      data: { user: fetchedUser },
    } = await supabase.auth.getUser()
    
    user = fetchedUser
    
    // Cache the result
    authCache.set(cacheKey, {
      user,
      timestamp: Date.now()
    })
    
    // Clean up old cache entries (keep cache size manageable)
    if (authCache.size > 100) {
      const oldestKeys = Array.from(authCache.keys()).slice(0, 50)
      oldestKeys.forEach(key => authCache.delete(key))
    }
  }

  // Define public routes that don't require authentication
  const publicRoutes = [
    '/api/echo',
    '/api/inngest', // Inngest webhook endpoint
    '/auth',
    '/login',
    '/library', // Library is public
    '/', // Home page
  ]
  
  const isPublicRoute = publicRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  )

  // Early exit for public routes - no need to check authentication
  if (isPublicRoute) {
    return supabaseResponse
  }

  // Check if user is authenticated for protected routes
  if (!user) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // Check if email is verified (only for authenticated users)
  if (user && !user.email_confirmed_at) {
    // Allow access to auth routes and verify-email page
    if (!request.nextUrl.pathname.startsWith('/auth/verify-email') && 
        !request.nextUrl.pathname.startsWith('/auth/logout') &&
        !request.nextUrl.pathname.startsWith('/auth/error')) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/verify-email'
      return NextResponse.redirect(url)
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}