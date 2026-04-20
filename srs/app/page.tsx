import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const ROLE_HOME: Record<string, string> = {
  agent:      '/agent/sell',
  gate_staff: '/scanner',
  admin:      '/admin/dashboard',
}

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // No login required — fans land on public home
  if (!user) redirect('/home')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role ?? 'fan'

  // Fans go to public home after login too
  if (role === 'fan') redirect('/home')

  // Staff roles go to their dashboards
  redirect(ROLE_HOME[role])
}