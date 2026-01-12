import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Module-level flag to log warning only once per server start
let envWarningLogged = false

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    // Only log once per server start, not on every request
    if (!envWarningLogged) {
      console.error(
        'Missing Supabase environment variables in middleware.\n' +
        'Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local\n' +
        'and restart your dev server.'
      )
      envWarningLogged = true
    }
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    )
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          cookiesToSet.forEach(({ name, value }: { name: string; value: string }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options?: any }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it so that the
  // middleware and server-side client/server code use different Supabase
  // instances!

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isPublicRoute = pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/register')

  // If no user and trying to access protected route, redirect to login
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // If user is authenticated, check role-based routing
  if (user) {
    // Check if user is admin using admin_users table
    const { data: adminCheck } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    const isAdmin = !!adminCheck
    const isAdminRoute = pathname.startsWith('/admin')
    const isDashboardRoute = pathname.startsWith('/dashboard') || pathname === '/events'

    // Redirect admins away from participant routes to admin dashboard
    if (isAdmin && isDashboardRoute && !isAdminRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin'
      return NextResponse.redirect(url)
    }

    // Redirect participants away from admin routes to dashboard
    if (!isAdmin && isAdminRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely.

  return supabaseResponse
}
