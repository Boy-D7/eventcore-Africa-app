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

  if (!user) redirect('/home')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role ?? 'fan'

  if (role === 'admin' || role === 'super_admin') redirect('/admin/dashboard')
  if (role === 'agent') redirect('/agent/sell')
  if (role === 'gate_staff') redirect('/scanner')
  
  redirect('/home')
}