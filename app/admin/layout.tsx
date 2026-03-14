import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/admin/AdminSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') redirect('/')

  const userName = (profile as { full_name: string | null }).full_name ?? 'Admin'
  const userEmail = user.email ?? ''

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar userName={userName} userEmail={userEmail} />

      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
