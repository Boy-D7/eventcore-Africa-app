import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that never require login
const PUBLIC_ROUTES = [
  '/',
  '/home',
  '/login',
  '/register',
  '/api/auth/callback',
]

// Routes that require specific roles
const ROLE_ROUTES: Record<string, string> = {
  '/admin':   'admin',
  '/agent':   'agent',
  '/scanner': 'gate_staff',
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  // Allow public routes freely
  const isPublic = PUBLIC_ROUTES.some(route => path.startsWith(route))
  if (isPublic) return supabaseResponse

  // No user → send to login
  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', path)
    return NextResponse.redirect(loginUrl)
  }

  // Check role-protected routes
  const protectedEntry = Object.entries(ROLE_ROUTES).find(([route]) =>
    path.startsWith(route)
  )

  if (protectedEntry) {
    const [, requiredRole] = protectedEntry

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== requiredRole) {
      // Wrong role → send home
      return NextResponse.redirect(new URL('/home', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}