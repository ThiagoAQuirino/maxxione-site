import { supabaseAdmin } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { formatCurrency, formatDate } from '@/lib/utils'
import OrderActions from './OrderActions'

interface Props {
  params: Promise<{ id: string }>
}

const statusLabels: Record<string, { label: string; class: string }> = {
  pending:    { label: 'Pendente',    class: 'bg-yellow-100 text-yellow-800' },
  paid:       { label: 'Pago',        class: 'bg-blue-100 text-blue-800' },
  processing: { label: 'Processando', class: 'bg-purple-100 text-purple-800' },
  shipped:    { label: 'Enviado',     class: 'bg-indigo-100 text-indigo-800' },
  delivered:  { label: 'Entregue',    class: 'bg-green-100 text-green-800' },
  cancelled:  { label: 'Cancelado',   class: 'bg-red-100 text-red-800' },
  refunded:   { label: 'Reembolsado', class: 'bg-gray-100 text-gray-800' },
}

export default async function PedidoDetailPage({ params }: Props) {
  const { id } = await params

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select(`
      *,
      profiles:user_id ( full_name, phone ),
      order_items (
        id, product_name, variant_description, quantity, unit_price, total_price,
        products:product_id ( slug )
      ),
      order_status_history ( id, status, notes, created_at )
    `)
    .eq('id', id)
    .single()

  if (!order) notFound()

  const profile = order.profiles as { full_name: string | null; phone: string | null } | null
  const customerName = profile?.full_name ?? order.guest_name ?? 'Cliente'
  const customerEmail = order.guest_email ?? '—'

  const items = (order.order_items as {
    id: string; product_name: string; variant_description: string | null
    quantity: number; unit_price: number; total_price: number
    products: { slug: string } | null
  }[]) ?? []

  const history = ((order.order_status_history as {
    id: string; status: string; notes: string | null; created_at: string
  }[]) ?? []).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const shippingAddress = order.shipping_address as {
    recipient?: string; street?: string; number?: string; complement?: string
    neighborhood?: string; city?: string; state?: string; cep?: string
  } | null

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pedido {order.order_number}</h1>
          <p className="text-sm text-gray-500 mt-1">{formatDate(order.created_at)}</p>
        </div>
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${(statusLabels[order.status] ?? { class: 'bg-gray-100 text-gray-700' }).class}`}>
          {(statusLabels[order.status] ?? { label: order.status }).label}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Items */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Itens do Pedido</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {items.map((item) => (
                <div key={item.id} className="px-5 py-4 flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.product_name}</p>
                    {item.variant_description && (
                      <p className="text-xs text-gray-500 mt-0.5">{item.variant_description}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm text-gray-600">{item.quantity} × {formatCurrency(item.unit_price)}</p>
                    <p className="font-medium text-gray-900">{formatCurrency(item.total_price)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Price breakdown */}
            <div className="px-5 py-4 border-t border-gray-100 space-y-2 bg-gray-50 rounded-b-xl">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Desconto</span>
                  <span>− {formatCurrency(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-gray-600">
                <span>Frete</span>
                <span>{order.shipping_cost > 0 ? formatCurrency(order.shipping_cost) : 'Grátis'}</span>
              </div>
              <div className="flex justify-between font-semibold text-gray-900 text-base border-t border-gray-200 pt-2">
                <span>Total</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Shipping address */}
          {shippingAddress && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-5 py-4">
              <h2 className="font-semibold text-gray-900 mb-3">Endereço de Entrega</h2>
              <div className="text-sm text-gray-700 space-y-1">
                {shippingAddress.recipient && <p className="font-medium">{shippingAddress.recipient}</p>}
                <p>{shippingAddress.street}, {shippingAddress.number}{shippingAddress.complement ? ` — ${shippingAddress.complement}` : ''}</p>
                <p>{shippingAddress.neighborhood} — {shippingAddress.city}/{shippingAddress.state}</p>
                {shippingAddress.cep && <p>CEP: {shippingAddress.cep}</p>}
              </div>
            </div>
          )}

          {/* Status timeline */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-5 py-4">
            <h2 className="font-semibold text-gray-900 mb-4">Histórico de Status</h2>
            <div className="space-y-3">
              {history.map((h, i) => {
                const info = statusLabels[h.status] ?? { label: h.status, class: 'bg-gray-100 text-gray-700' }
                return (
                  <div key={h.id} className="flex items-start gap-3">
                    <div className={`mt-0.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${i === 0 ? 'bg-pink-500' : 'bg-gray-300'}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${info.class}`}>{info.label}</span>
                        <span className="text-xs text-gray-400">{formatDate(h.created_at)}</span>
                      </div>
                      {h.notes && <p className="text-xs text-gray-500 mt-0.5">{h.notes}</p>}
                    </div>
                  </div>
                )
              })}
              {history.length === 0 && <p className="text-sm text-gray-400">Sem histórico de status</p>}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Customer info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-5 py-4">
            <h2 className="font-semibold text-gray-900 mb-3">Cliente</h2>
            <div className="text-sm space-y-1">
              <p className="font-medium text-gray-900">{customerName}</p>
              <p className="text-gray-500">{customerEmail}</p>
              {profile?.phone && <p className="text-gray-500">{profile.phone}</p>}
            </div>
          </div>

          {/* Payment info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-5 py-4">
            <h2 className="font-semibold text-gray-900 mb-3">Pagamento</h2>
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Método</span>
                <span className="text-gray-800 font-medium">{order.payment_method ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className="text-gray-800 font-medium">{order.payment_status}</span>
              </div>
              {order.payment_id && (
                <div>
                  <span className="text-gray-500">ID</span>
                  <p className="text-xs font-mono text-gray-600 mt-0.5 break-all">{order.payment_id}</p>
                </div>
              )}
            </div>
          </div>

          {/* Update status + tracking */}
          <OrderActions
            orderId={order.id}
            currentStatus={order.status}
            currentTracking={order.tracking_code ?? ''}
          />
        </div>
      </div>
    </div>
  )
}
