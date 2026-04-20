import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/home'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Get user role and redirect accordingly
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        const role = profile?.role ?? 'fan'

        const ROLE_HOME: Record<string, string> = {
          fan:        next,
          agent:      '/agent/sell',
          gate_staff: '/scanner',
          admin:      '/admin/dashboard',
        }

        return NextResponse.redirect(
          new URL(ROLE_HOME[role], origin)
        )
      }
    }
  }

  return NextResponse.redirect(
    new URL('/login?error=auth', origin)
  )
}