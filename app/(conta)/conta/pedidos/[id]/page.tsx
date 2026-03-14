import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Detalhes do Pedido | MaxxiOne',
}

interface PageProps {
  params: Promise<{ id: string }>
}

const STATUS_CONFIG: Record<string, { label: string; color: string; step: number }> = {
  pending: { label: 'Pedido recebido', color: 'bg-yellow-100 text-yellow-700', step: 1 },
  paid: { label: 'Pagamento confirmado', color: 'bg-green-100 text-green-700', step: 2 },
  processing: { label: 'Em processamento', color: 'bg-blue-100 text-blue-700', step: 2 },
  shipped: { label: 'Enviado', color: 'bg-indigo-100 text-indigo-700', step: 3 },
  delivered: { label: 'Entregue', color: 'bg-green-100 text-green-700', step: 4 },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-700', step: 0 },
  refunded: { label: 'Reembolsado', color: 'bg-gray-100 text-gray-700', step: 0 },
}

const TIMELINE_STEPS = [
  { label: 'Pedido Recebido', step: 1 },
  { label: 'Pagamento Confirmado', step: 2 },
  { label: 'Enviado', step: 3 },
  { label: 'Entregue', step: 4 },
]

export default async function PedidoDetalhe({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: orderRaw } = await supabase
    .from('orders')
    .select(`
      id, order_number, status, subtotal, discount, shipping_cost, total,
      shipping_address, payment_method, tracking_code, created_at,
      order_items(id, product_name, variant_description, quantity, unit_price, total_price),
      order_status_history(id, status, notes, created_at)
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!orderRaw) notFound()

  const order = orderRaw as unknown as {
    id: string; order_number: string; status: string; subtotal: number; discount: number
    shipping_cost: number; total: number; shipping_address: Record<string, string> | null
    payment_method: string | null; tracking_code: string | null; created_at: string
    order_items: { id: string; product_name: string; variant_description: string | null; quantity: number; unit_price: number; total_price: number }[]
    order_status_history: { id: string; status: string; notes: string | null; created_at: string }[]
  }

  const statusCfg = STATUS_CONFIG[order.status] ?? { label: order.status, color: 'bg-gray-100 text-gray-700', step: 1 }
  const addr = (order.shipping_address ?? {}) as Record<string, string>
  const statusHistory = [...(order.order_status_history ?? [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
  const isCancelled = order.status === 'cancelled' || order.status === 'refunded'

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/conta/pedidos" className="text-gray-500 hover:text-pink-600 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h2 className="text-xl font-black text-gray-900">Pedido {order.order_number}</h2>
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusCfg.color}`}>
          {statusCfg.label}
        </span>
      </div>

      <div className="space-y-5">
        {/* Status timeline */}
        {!isCancelled && (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
            <h3 className="text-sm font-bold text-gray-700 mb-5">Acompanhamento</h3>
            <div className="flex items-start gap-0">
              {TIMELINE_STEPS.map((ts, idx) => {
                const done = statusCfg.step >= ts.step
                const active = statusCfg.step === ts.step
                return (
                  <div key={ts.step} className="flex items-start flex-1 last:flex-none">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                        done ? 'bg-pink-500 text-white' : 'bg-gray-200 text-gray-400'
                      } ${active ? 'ring-4 ring-pink-100' : ''}`}>
                        {done ? (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : ts.step}
                      </div>
                      <span className={`text-xs mt-1.5 font-medium text-center max-w-[60px] ${done ? 'text-pink-600' : 'text-gray-400'}`}>
                        {ts.label}
                      </span>
                    </div>
                    {idx < TIMELINE_STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mt-4 mx-1 ${statusCfg.step > ts.step ? 'bg-pink-500' : 'bg-gray-200'}`} />
                    )}
                  </div>
                )
              })}
            </div>

            {order.tracking_code && (
              <div className="mt-5 bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                <p className="text-sm font-semibold text-indigo-800">Código de rastreio</p>
                <p className="text-sm font-mono text-indigo-600 mt-0.5">{order.tracking_code}</p>
              </div>
            )}
          </div>
        )}

        {/* Status history */}
        {statusHistory.length > 0 && (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
            <h3 className="text-sm font-bold text-gray-700 mb-4">Histórico</h3>
            <div className="space-y-3">
              {statusHistory.map((h) => {
                const cfg = STATUS_CONFIG[h.status]
                return (
                  <div key={h.id} className="flex gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-pink-500 mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-gray-900">{cfg?.label ?? h.status}</p>
                      {h.notes && <p className="text-xs text-gray-500">{h.notes}</p>}
                      <p className="text-xs text-gray-400">{formatDate(h.created_at)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Items */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Itens do Pedido</h3>
          <div className="space-y-4">
            {(order.order_items ?? []).map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <div>
                  <p className="font-semibold text-gray-900">{item.product_name}</p>
                  {item.variant_description && (
                    <p className="text-xs text-gray-500">{item.variant_description}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    {item.quantity} × {formatCurrency(item.unit_price)}
                  </p>
                </div>
                <p className="font-bold text-gray-900">{formatCurrency(item.total_price)}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 mt-4 pt-4 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Desconto</span>
                <span>-{formatCurrency(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>Frete</span>
              <span>{order.shipping_cost === 0 ? 'Grátis' : formatCurrency(order.shipping_cost)}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-100">
              <span>Total</span>
              <span className="text-pink-600 text-base">{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Shipping address */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Endereço de Entrega</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              {addr.recipient && <><span className="font-semibold">{addr.recipient}</span><br /></>}
              {addr.street}{addr.number ? `, ${addr.number}` : ''}{addr.complement ? ` — ${addr.complement}` : ''}<br />
              {addr.neighborhood && `${addr.neighborhood}, `}{addr.city} — {addr.state}<br />
              CEP: {addr.cep}
            </p>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Pagamento</h3>
            <p className="text-sm text-gray-600">
              {order.payment_method
                ? <span className="capitalize">{order.payment_method}</span>
                : 'Mercado Pago'
              }
            </p>
            <p className="text-xs text-gray-400 mt-1">Pedido em {formatDate(order.created_at)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
