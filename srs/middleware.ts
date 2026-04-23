import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  try {
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

    await supabase.auth.getUser()

  } catch (e) {
    // If Supabase fails don't block the request
    console.error('Middleware error:', e)
  }

  const path = request.nextUrl.pathname

  const isPublic =
    path === '/' ||
    path.startsWith('/home') ||
    path.startsWith('/login') ||
    path.startsWith('/register') ||
    path.startsWith('/api/auth') ||
    path.startsWith('/_next') ||
    path.startsWith('/favicon') ||
    path.startsWith('/logo') ||
    path.startsWith('/manifest') ||
    path.startsWith('/sw.js')

  if (isPublic) return supabaseResponse

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}