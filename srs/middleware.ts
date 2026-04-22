import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/', '/home', '/login', '/register', '/api/auth/callback']

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  const isPublic = PUBLIC_ROUTES.some(route =>
    path.startsWith(route)
  )

  // Let public routes pass
  if (isPublic) {
    return NextResponse.next()
  }

  // 🔥 TEMP: no auth check here (we'll handle inside pages)
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
