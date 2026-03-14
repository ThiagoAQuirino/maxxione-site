import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Meus Pedidos | MaxxiOne',
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700' },
  paid: { label: 'Pago', color: 'bg-green-100 text-green-700' },
  processing: { label: 'Em processamento', color: 'bg-blue-100 text-blue-700' },
  shipped: { label: 'Enviado', color: 'bg-indigo-100 text-indigo-700' },
  delivered: { label: 'Entregue', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-700' },
  refunded: { label: 'Reembolsado', color: 'bg-gray-100 text-gray-700' },
}

export default async function PedidosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: ordersRaw } = await supabase
    .from('orders')
    .select(`
      id, order_number, status, total, subtotal, discount, shipping_cost, created_at,
      order_items(product_name, quantity)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const orders = ordersRaw as unknown as {
    id: string; order_number: string; status: string; total: number
    subtotal: number; discount: number; shipping_cost: number; created_at: string
    order_items: { product_name: string; quantity: number }[]
  }[] | null

  return (
    <div>
      <h2 className="text-xl font-black text-gray-900 mb-6">Meus Pedidos</h2>

      {!orders?.length ? (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-12 text-center">
          <svg className="w-16 h-16 text-gray-200 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-gray-500 font-medium mb-4">Você ainda não fez nenhum pedido.</p>
          <Link
            href="/loja"
            className="inline-block bg-pink-500 hover:bg-pink-600 text-white font-bold px-6 py-3 rounded-2xl transition-colors"
          >
            Ir para a loja
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const statusCfg = STATUS_CONFIG[order.status] ?? { label: order.status, color: 'bg-gray-100 text-gray-700' }
            const itemSummary = (order.order_items ?? [])
              .slice(0, 2)
              .map((i) => `${i.product_name} (×${i.quantity})`)
              .join(', ')
            const extraItems = (order.order_items ?? []).length - 2

            return (
              <div key={order.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 bg-gray-50 border-b border-gray-100">
                  <div>
                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Pedido</span>
                    <p className="text-sm font-black text-gray-900">{order.order_number}</p>
                  </div>
                  <div className="text-center">
                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Data</span>
                    <p className="text-sm font-semibold text-gray-700">{formatDate(order.created_at)}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusCfg.color}`}>
                    {statusCfg.label}
                  </span>
                </div>

                {/* Body */}
                <div className="px-5 py-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-600 truncate">
                      {itemSummary}
                      {extraItems > 0 && ` +${extraItems} item${extraItems > 1 ? 'ns' : ''}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <span className="text-base font-black text-gray-900">{formatCurrency(order.total)}</span>
                    <Link
                      href={`/conta/pedidos/${order.id}`}
                      className="text-sm font-semibold text-pink-600 hover:text-pink-700 transition-colors border border-pink-200 hover:border-pink-400 px-3 py-1.5 rounded-lg"
                    >
                      Ver detalhes
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
