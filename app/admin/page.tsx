import { supabaseAdmin } from '@/lib/supabase/admin'
import { formatCurrency, formatDate } from '@/lib/utils'

const statusLabels: Record<string, { label: string; class: string }> = {
  pending:    { label: 'Pendente',    class: 'bg-yellow-100 text-yellow-800' },
  paid:       { label: 'Pago',        class: 'bg-blue-100 text-blue-800' },
  processing: { label: 'Processando', class: 'bg-purple-100 text-purple-800' },
  shipped:    { label: 'Enviado',     class: 'bg-indigo-100 text-indigo-800' },
  delivered:  { label: 'Entregue',    class: 'bg-green-100 text-green-800' },
  cancelled:  { label: 'Cancelado',   class: 'bg-red-100 text-red-800' },
  refunded:   { label: 'Reembolsado', class: 'bg-gray-100 text-gray-800' },
}

export default async function AdminDashboardPage() {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

  // Fetch all stats in parallel
  const [
    { data: salesData },
    { count: ordersToday },
    { count: activeProducts },
    { count: totalClients },
    { data: recentOrders },
    { data: lowStockVariants },
  ] = await Promise.all([
    supabaseAdmin
      .from('orders')
      .select('total')
      .gte('created_at', thirtyDaysAgo)
      .in('status', ['paid', 'processing', 'shipped', 'delivered']),
    supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart),
    supabaseAdmin
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('active', true),
    supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'customer'),
    supabaseAdmin
      .from('orders')
      .select(`
        id, order_number, created_at, status, total, payment_status,
        guest_name, guest_email,
        profiles:user_id ( full_name )
      `)
      .order('created_at', { ascending: false })
      .limit(10),
    supabaseAdmin
      .from('product_variants')
      .select(`
        id, size, color, stock,
        products:product_id ( name )
      `)
      .lt('stock', 5)
      .eq('active', true)
      .order('stock', { ascending: true })
      .limit(10),
  ])

  const totalSales = (salesData ?? []).reduce((sum, o) => sum + o.total, 0)

  const stats = [
    { label: 'Vendas (30 dias)', value: formatCurrency(totalSales), color: 'bg-pink-500' },
    { label: 'Pedidos hoje',     value: String(ordersToday ?? 0),   color: 'bg-blue-500' },
    { label: 'Produtos ativos',  value: String(activeProducts ?? 0), color: 'bg-green-500' },
    { label: 'Clientes',         value: String(totalClients ?? 0),  color: 'bg-purple-500' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{stat.value}</p>
            <div className={`mt-3 h-1 w-16 rounded-full ${stat.color}`} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent orders */}
        <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Últimos Pedidos</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase bg-gray-50">
                  <th className="px-4 py-3 font-medium">Pedido</th>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(recentOrders ?? []).map((order) => {
                  const profile = order.profiles as { full_name: string | null } | null
                  const customerName = profile?.full_name ?? order.guest_name ?? '—'
                  const statusInfo = statusLabels[order.status] ?? { label: order.status, class: 'bg-gray-100 text-gray-700' }
                  return (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">{order.order_number}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(order.created_at)}</td>
                      <td className="px-4 py-3 text-gray-800">{customerName}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{formatCurrency(order.total)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.class}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
                {(recentOrders ?? []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">Nenhum pedido encontrado</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low stock alert */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <span className="text-orange-500">⚠️</span>
            <h2 className="font-semibold text-gray-900">Estoque Baixo</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {(lowStockVariants ?? []).map((v) => {
              const product = v.products as { name: string } | null
              return (
                <div key={v.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800 truncate max-w-[160px]">{product?.name ?? '—'}</p>
                    <p className="text-xs text-gray-400">
                      {[v.size, v.color].filter(Boolean).join(' / ') || 'Padrão'}
                    </p>
                  </div>
                  <span className={`text-sm font-bold ${v.stock === 0 ? 'text-red-600' : 'text-orange-500'}`}>
                    {v.stock} un
                  </span>
                </div>
              )
            })}
            {(lowStockVariants ?? []).length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-gray-400">Estoque normalizado ✓</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
