import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { formatCurrency, formatDate } from '@/lib/utils'
import PedidosSearch from './PedidosSearch'

const PAGE_SIZE = 20

const statusLabels: Record<string, { label: string; class: string }> = {
  pending:    { label: 'Pendente',    class: 'bg-yellow-100 text-yellow-800' },
  paid:       { label: 'Pago',        class: 'bg-blue-100 text-blue-800' },
  processing: { label: 'Processando', class: 'bg-purple-100 text-purple-800' },
  shipped:    { label: 'Enviado',     class: 'bg-indigo-100 text-indigo-800' },
  delivered:  { label: 'Entregue',    class: 'bg-green-100 text-green-800' },
  cancelled:  { label: 'Cancelado',   class: 'bg-red-100 text-red-800' },
  refunded:   { label: 'Reembolsado', class: 'bg-gray-100 text-gray-800' },
}

const paymentStatusLabels: Record<string, { label: string; class: string }> = {
  pending:  { label: 'Aguardando', class: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'Aprovado',   class: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejeitado',  class: 'bg-red-100 text-red-700' },
  refunded: { label: 'Reembolsado',class: 'bg-gray-100 text-gray-600' },
}

interface Props {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>
}

export default async function PedidosPage({ searchParams }: Props) {
  const params = await searchParams
  const q = params.q ?? ''
  const status = params.status ?? ''
  const page = parseInt(params.page ?? '1', 10)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabaseAdmin
    .from('orders')
    .select(`
      id, order_number, created_at, status, payment_status, total,
      guest_name, guest_email,
      profiles:user_id ( full_name ),
      order_items ( id )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (status) query = query.eq('status', status)
  if (q) {
    query = query.or(`order_number.ilike.%${q}%,guest_email.ilike.%${q}%`)
  }

  const { data: orders, count } = await query
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  function buildUrl(overrides: Record<string, string>) {
    const p = new URLSearchParams()
    if (q) p.set('q', q)
    if (status) p.set('status', status)
    p.set('page', String(page))
    Object.entries(overrides).forEach(([k, v]) => {
      if (v) p.set(k, v)
      else p.delete(k)
    })
    return `/admin/pedidos?${p.toString()}`
  }

  // Build CSV data for client
  const csvData = (orders ?? []).map((order) => {
    const profile = order.profiles as { full_name: string | null } | null
    const items = (order.order_items as { id: string }[] | null) ?? []
    return {
      order_number: order.order_number,
      date: formatDate(order.created_at),
      customer: profile?.full_name ?? order.guest_name ?? '',
      email: order.guest_email ?? '',
      items: items.length,
      total: order.total,
      payment_status: order.payment_status,
      status: order.status,
    }
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
        <PedidosSearch csvData={csvData} q={q} status={status} />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase bg-gray-50">
                <th className="px-4 py-3 font-medium">Nº Pedido</th>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Itens</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Pagamento</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(orders ?? []).map((order) => {
                const profile = order.profiles as { full_name: string | null } | null
                const customerName = profile?.full_name ?? order.guest_name ?? '—'
                const items = (order.order_items as { id: string }[] | null) ?? []
                const statusInfo = statusLabels[order.status] ?? { label: order.status, class: 'bg-gray-100 text-gray-700' }
                const payInfo = paymentStatusLabels[order.payment_status] ?? { label: order.payment_status, class: 'bg-gray-100 text-gray-600' }

                return (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700 font-medium">{order.order_number}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(order.created_at)}</td>
                    <td className="px-4 py-3">
                      <p className="text-gray-800 font-medium">{customerName}</p>
                      {order.guest_email && <p className="text-xs text-gray-400">{order.guest_email}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{items.length}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{formatCurrency(order.total)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${payInfo.class}`}>
                        {payInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.class}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/pedidos/${order.id}`}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                      >
                        Ver detalhes
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {(orders ?? []).length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">Nenhum pedido encontrado</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Página {page} de {totalPages} — {count} pedido{count !== 1 ? 's' : ''}
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
