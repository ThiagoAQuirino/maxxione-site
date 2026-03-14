import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pedido Confirmado | MaxxiOne',
}

interface PageProps {
  searchParams: Promise<{ order_number?: string }>
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  processing: 'Em processamento',
  shipped: 'Enviado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
}

export default async function CheckoutSucessoPage({ searchParams }: PageProps) {
  const { order_number } = await searchParams
  const supabase = await createClient()

  let order: {
    id: string
    order_number: string
    status: string
    subtotal: number
    discount: number
    shipping_cost: number
    total: number
    shipping_address: Record<string, string>
    payment_method: string | null
    created_at: string
    order_items: {
      id: string
      product_name: string
      variant_description: string | null
      quantity: number
      unit_price: number
      total_price: number
    }[]
  } | null = null

  if (order_number) {
    const { data } = await supabase
      .from('orders')
      .select(`
        id, order_number, status, subtotal, discount, shipping_cost, total,
        shipping_address, payment_method, created_at,
        order_items(id, product_name, variant_description, quantity, unit_price, total_price)
      `)
      .eq('order_number', order_number)
      .single()

    if (data) {
      const raw = data as unknown as {
        id: string; order_number: string; status: string; subtotal: number
        discount: number; shipping_cost: number; total: number
        shipping_address: Record<string, string> | null; payment_method: string | null
        created_at: string
        order_items: { id: string; product_name: string; variant_description: string | null; quantity: number; unit_price: number; total_price: number }[]
      }
      order = {
        ...raw,
        shipping_address: (raw.shipping_address ?? {}) as Record<string, string>,
        order_items: raw.order_items ?? [],
      }
    }
  }

  if (!order) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-black text-gray-900 mb-4">Pedido não encontrado</h1>
        <Link href="/loja" className="text-pink-600 font-semibold hover:underline">
          Voltar para a loja
        </Link>
      </div>
    )
  }

  const addr = order.shipping_address

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      {/* Success banner */}
      <div className="text-center mb-10">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl font-black text-gray-900 mb-2">Pedido realizado com sucesso!</h1>
        <p className="text-gray-500">Obrigado pela sua compra. Você receberá um e-mail de confirmação em breve.</p>
      </div>

      {/* Order info card */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden mb-6">
        <div className="bg-pink-50 px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Número do pedido</p>
            <p className="text-lg font-black text-gray-900">{order.order_number}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Data</p>
            <p className="text-sm font-semibold text-gray-700">{formatDate(order.created_at)}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
            order.status === 'paid' || order.status === 'delivered'
              ? 'bg-green-100 text-green-700'
              : order.status === 'cancelled'
              ? 'bg-red-100 text-red-700'
              : 'bg-yellow-100 text-yellow-700'
          }`}>
            {STATUS_LABELS[order.status] ?? order.status}
          </span>
        </div>

        {/* Items */}
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-700 mb-3">Itens do Pedido</h3>
          <div className="space-y-3">
            {order.order_items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <div>
                  <p className="font-medium text-gray-900">{item.product_name}</p>
                  {item.variant_description && (
                    <p className="text-xs text-gray-500">{item.variant_description}</p>
                  )}
                  <p className="text-xs text-gray-400">Qtd: {item.quantity} × {formatCurrency(item.unit_price)}</p>
                </div>
                <p className="font-semibold text-gray-900">{formatCurrency(item.total_price)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="px-6 py-4 border-b border-gray-100 space-y-2 text-sm">
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

        {/* Shipping address */}
        {addr && (
          <div className="px-6 py-4 border-b border-gray-100 text-sm">
            <h3 className="font-bold text-gray-700 mb-2">Endereço de Entrega</h3>
            <p className="text-gray-600">
              {addr.recipient && <span className="font-medium">{addr.recipient}<br /></span>}
              {addr.street}{addr.number ? `, ${addr.number}` : ''}{addr.complement ? ` — ${addr.complement}` : ''}<br />
              {addr.neighborhood && `${addr.neighborhood}, `}{addr.city} — {addr.state}<br />
              CEP: {addr.cep}
            </p>
          </div>
        )}

        {/* Payment */}
        {order.payment_method && (
          <div className="px-6 py-4 text-sm">
            <h3 className="font-bold text-gray-700 mb-1">Pagamento</h3>
            <p className="text-gray-600 capitalize">{order.payment_method}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href={`/conta/pedidos`}
          className="flex-1 text-center border-2 border-pink-500 text-pink-600 font-bold py-3.5 rounded-2xl hover:bg-pink-50 transition-colors"
        >
          Acompanhar Pedido
        </Link>
        <Link
          href="/loja"
          className="flex-1 text-center bg-pink-500 hover:bg-pink-600 text-white font-bold py-3.5 rounded-2xl transition-colors"
        >
          Continuar Comprando
        </Link>
      </div>
    </div>
  )
}
