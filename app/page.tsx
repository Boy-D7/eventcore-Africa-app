import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const ROLE_HOME: Record<string, string> = {
  agent: '/agent/sell',
  gate_staff: '/scanner',
  admin: '/admin/dashboard',
  super_admin: '/admin/dashboard',
}

export default async function Home() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // ✅ If NOT logged in → go to public homepage
  if (!user) {
    redirect('/home')
  }

  // ✅ Get role
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (error) {
    console.error('Profile fetch error:', error)
    redirect('/home')
  }

  const role = profile?.role ?? 'fan'

  // ✅ Redirect based on role
  const path = ROLE_HOME[role]

  if (path) {
    redirect(path)
  }

  // ✅ Default (fans)
  redirect('/home')
}