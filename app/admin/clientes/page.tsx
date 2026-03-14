import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { formatCurrency, formatDate } from '@/lib/utils'

const PAGE_SIZE = 20

interface Props {
  searchParams: Promise<{ q?: string; page?: string }>
}

export default async function ClientesPage({ searchParams }: Props) {
  const params = await searchParams
  const q = params.q ?? ''
  const page = parseInt(params.page ?? '1', 10)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  // Fetch profiles (customers only)
  let profileQuery = supabaseAdmin
    .from('profiles')
    .select('id, full_name, phone, role, created_at', { count: 'exact' })
    .eq('role', 'customer')
    .order('created_at', { ascending: false })
    .range(from, to)

  if (q) profileQuery = profileQuery.ilike('full_name', `%${q}%`)

  const { data: profiles, count } = await profileQuery
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  // Fetch auth users to get emails (admin API)
  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
  const emailMap = new Map<string, string>()
  for (const u of authUsers?.users ?? []) {
    if (u.email) emailMap.set(u.id, u.email)
  }

  // Fetch order stats per user
  const profileIds = (profiles ?? []).map((p) => p.id)
  let orderStats: { user_id: string; total_orders: number; total_spent: number }[] = []
  if (profileIds.length > 0) {
    const { data: orders } = await supabaseAdmin
      .from('orders')
      .select('user_id, total')
      .in('user_id', profileIds)
      .in('status', ['paid', 'processing', 'shipped', 'delivered'])

    const statsMap = new Map<string, { count: number; sum: number }>()
    for (const o of orders ?? []) {
      if (!o.user_id) continue
      const prev = statsMap.get(o.user_id) ?? { count: 0, sum: 0 }
      statsMap.set(o.user_id, { count: prev.count + 1, sum: prev.sum + o.total })
    }
    orderStats = profileIds.map((id) => ({
      user_id: id,
      total_orders: statsMap.get(id)?.count ?? 0,
      total_spent: statsMap.get(id)?.sum ?? 0,
    }))
  }

  function buildUrl(overrides: Record<string, string>) {
    const p = new URLSearchParams()
    if (q) p.set('q', q)
    p.set('page', String(page))
    Object.entries(overrides).forEach(([k, v]) => {
      if (v) p.set(k, v)
      else p.delete(k)
    })
    return `/admin/clientes?${p.toString()}`
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
        <span className="text-sm text-gray-500">{count ?? 0} cliente{count !== 1 ? 's' : ''}</span>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex gap-3">
        <form action="/admin/clientes" method="get" className="flex gap-3 flex-1">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Buscar por nome..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
          <button
            type="submit"
            className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Buscar
          </button>
          {q && (
            <Link href="/admin/clientes" className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Limpar
            </Link>
          )}
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase bg-gray-50">
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">E-mail</th>
                <th className="px-4 py-3 font-medium">Telefone</th>
                <th className="px-4 py-3 font-medium">Cadastro</th>
                <th className="px-4 py-3 font-medium">Pedidos</th>
                <th className="px-4 py-3 font-medium">Total gasto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(profiles ?? []).map((profile) => {
                const email = emailMap.get(profile.id) ?? '—'
                const stats = orderStats.find((s) => s.user_id === profile.id)
                return (
                  <tr key={profile.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                          {(profile.full_name ?? email)[0].toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900">{profile.full_name ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{email}</td>
                    <td className="px-4 py-3 text-gray-600">{profile.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(profile.created_at)}</td>
                    <td className="px-4 py-3 text-gray-800 font-medium">{stats?.total_orders ?? 0}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium">{formatCurrency(stats?.total_spent ?? 0)}</td>
                  </tr>
                )
              })}
              {(profiles ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">Nenhum cliente encontrado</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Página {page} de {totalPages}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={buildUrl({ page: String(page - 1) })} className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  ← Anterior
                </Link>
              )}
              {page < totalPages && (
                <Link href={buildUrl({ page: String(page + 1) })} className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  Próxima →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
