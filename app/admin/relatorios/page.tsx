import { supabaseAdmin } from '@/lib/supabase/admin'
import { formatCurrency } from '@/lib/utils'
import RelatorioPeriodToggle from './RelatorioPeriodToggle'

interface Props {
  searchParams: Promise<{ period?: string }>
}

export default async function RelatoriosPage({ searchParams }: Props) {
  const params = await searchParams
  const period = params.period ?? 'monthly'

  const now = new Date()
  let startDate: Date
  let groupFn: (date: string) => string
  let groupLabel: string

  if (period === 'daily') {
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    groupFn = (d) => d.slice(0, 10)
    groupLabel = 'Dia'
  } else if (period === 'weekly') {
    startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    groupFn = (d) => {
      const dt = new Date(d)
      const week = Math.floor((dt.getTime() - new Date(dt.getFullYear(), 0, 1).getTime()) / (7 * 86400000))
      return `${dt.getFullYear()}-S${String(week).padStart(2, '0')}`
    }
    groupLabel = 'Semana'
  } else {
    startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
    groupFn = (d) => d.slice(0, 7)
    groupLabel = 'Mês'
  }

  // Fetch orders in period
  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('id, total, created_at, payment_method')
    .gte('created_at', startDate.toISOString())
    .in('status', ['paid', 'processing', 'shipped', 'delivered'])
    .order('created_at', { ascending: true })

  // Group by period
  const periodMap = new Map<string, { orders: number; revenue: number }>()
  for (const o of orders ?? []) {
    const key = groupFn(o.created_at)
    const prev = periodMap.get(key) ?? { orders: 0, revenue: 0 }
    periodMap.set(key, { orders: prev.orders + 1, revenue: prev.revenue + o.total })
  }
  const periodData = Array.from(periodMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, val]) => ({ period: key, ...val }))

  // Revenue by payment method
  const paymentMap = new Map<string, number>()
  for (const o of orders ?? []) {
    const method = o.payment_method ?? 'desconhecido'
    paymentMap.set(method, (paymentMap.get(method) ?? 0) + o.total)
  }
  const paymentData = Array.from(paymentMap.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([method, revenue]) => ({ method, revenue }))

  // Top products by revenue + quantity — use order IDs from already-fetched orders
  const orderIds = (orders ?? []).map((o) => o.id)
  let orderItems: { product_name: string; quantity: number; total_price: number }[] = []
  if (orderIds.length > 0) {
    const { data } = await supabaseAdmin
      .from('order_items')
      .select('product_name, quantity, total_price')
      .in('order_id', orderIds)
    orderItems = data ?? []
  }

  const productRevenueMap = new Map<string, { revenue: number; quantity: number }>()
  for (const item of orderItems ?? []) {
    const prev = productRevenueMap.get(item.product_name) ?? { revenue: 0, quantity: 0 }
    productRevenueMap.set(item.product_name, {
      revenue: prev.revenue + item.total_price,
      quantity: prev.quantity + item.quantity,
    })
  }

  const topByRevenue = Array.from(productRevenueMap.entries())
    .sort(([, a], [, b]) => b.revenue - a.revenue)
    .slice(0, 10)
    .map(([name, val]) => ({ name, ...val }))

  const topByQuantity = Array.from(productRevenueMap.entries())
    .sort(([, a], [, b]) => b.quantity - a.quantity)
    .slice(0, 10)
    .map(([name, val]) => ({ name, ...val }))

  const totalRevenue = (orders ?? []).reduce((s, o) => s + o.total, 0)
  const totalOrders = orders?.length ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
        <RelatorioPeriodToggle period={period} />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Receita no período</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Pedidos no período</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalOrders}</p>
        </div>
      </div>

      {/* Sales by period */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Vendas por {groupLabel}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase bg-gray-50">
                <th className="px-4 py-3 font-medium">{groupLabel}</th>
                <th className="px-4 py-3 font-medium">Pedidos</th>
                <th className="px-4 py-3 font-medium">Receita</th>
                <th className="px-4 py-3 font-medium">Ticket médio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {periodData.slice().reverse().map((row) => (
                <tr key={row.period} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{row.period}</td>
                  <td className="px-4 py-3 text-gray-800">{row.orders}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{formatCurrency(row.revenue)}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {row.orders > 0 ? formatCurrency(row.revenue / row.orders) : '—'}
                  </td>
                </tr>
              ))}
              {periodData.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Sem dados no período</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top by revenue */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Top 10 — Maior receita</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {topByRevenue.map((p, i) => (
              <div key={p.name} className="px-5 py-3 flex items-center gap-3">
                <span className="text-xs font-bold text-gray-400 w-5">{i + 1}</span>
                <span className="flex-1 text-sm text-gray-800 truncate">{p.name}</span>
                <span className="text-sm font-semibold text-gray-900">{formatCurrency(p.revenue)}</span>
              </div>
            ))}
            {topByRevenue.length === 0 && <p className="px-5 py-6 text-sm text-gray-400 text-center">Sem dados</p>}
          </div>
        </div>

        {/* Top by quantity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Top 10 — Maior quantidade vendida</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {topByQuantity.map((p, i) => (
              <div key={p.name} className="px-5 py-3 flex items-center gap-3">
                <span className="text-xs font-bold text-gray-400 w-5">{i + 1}</span>
                <span className="flex-1 text-sm text-gray-800 truncate">{p.name}</span>
                <span className="text-sm font-semibold text-gray-900">{p.quantity} un</span>
              </div>
            ))}
            {topByQuantity.length === 0 && <p className="px-5 py-6 text-sm text-gray-400 text-center">Sem dados</p>}
          </div>
        </div>
      </div>

      {/* Revenue by payment method */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Receita por Método de Pagamento</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {paymentData.map((p) => (
            <div key={p.method} className="px-5 py-3 flex items-center justify-between">
              <span className="text-sm text-gray-700 capitalize">{p.method}</span>
              <div className="text-right">
                <span className="text-sm font-semibold text-gray-900">{formatCurrency(p.revenue)}</span>
                {totalRevenue > 0 && (
                  <span className="text-xs text-gray-400 ml-2">
                    ({((p.revenue / totalRevenue) * 100).toFixed(1)}%)
                  </span>
                )}
              </div>
            </div>
          ))}
          {paymentData.length === 0 && <p className="px-5 py-6 text-sm text-gray-400 text-center">Sem dados</p>}
        </div>
      </div>
    </div>
  )
}
