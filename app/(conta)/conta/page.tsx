import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Minha Conta | MaxxiOne',
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700' },
  paid: { label: 'Pago', color: 'bg-green-100 text-green-700' },
  processing: { label: 'Em processo', color: 'bg-blue-100 text-blue-700' },
  shipped: { label: 'Enviado', color: 'bg-indigo-100 text-indigo-700' },
  delivered: { label: 'Entregue', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-700' },
  refunded: { label: 'Reembolsado', color: 'bg-gray-100 text-gray-700' },
}

export default async function ContaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [profileRes, ordersRes, addressesRes, wishlistRes] = await Promise.all([
    supabase.from('profiles').select('full_name, avatar_url, phone').eq('id', user.id).single(),
    supabase.from('orders').select('id, order_number, status, total, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('addresses').select('id').eq('user_id', user.id),
    supabase.from('wishlists').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
  ])

  const profile = profileRes.data as { full_name: string | null; avatar_url: string | null; phone: string | null } | null
  const orders = ordersRes.data as { id: string; order_number: string; status: string; total: number; created_at: string }[] | null
  const addresses = addressesRes.data
  const wishlistCount = wishlistRes.count
  const displayName = profile?.full_name ?? user.user_metadata?.full_name ?? 'Cliente'

  return (
    <div className="space-y-6">
      {/* Profile card */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 bg-pink-100 rounded-full flex items-center justify-center text-pink-600 font-black text-xl uppercase">
            {displayName.charAt(0)}
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{displayName}</h2>
            <p className="text-sm text-gray-500">{user.email}</p>
            {profile?.phone && <p className="text-sm text-gray-500">{profile.phone}</p>}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
          <div className="text-center">
            <p className="text-2xl font-black text-gray-900">{orders?.length ?? 0}</p>
            <p className="text-xs text-gray-500 mt-0.5">Pedidos</p>
          </div>
          <div className="text-center border-x border-gray-100">
            <p className="text-2xl font-black text-gray-900">{addresses?.length ?? 0}</p>
            <p className="text-xs text-gray-500 mt-0.5">Endereços</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-gray-900">{wishlistCount ?? 0}</p>
            <p className="text-xs text-gray-500 mt-0.5">Lista de desejos</p>
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-gray-900">Pedidos Recentes</h3>
          <Link href="/conta/pedidos" className="text-sm text-pink-600 font-semibold hover:underline">
            Ver todos
          </Link>
        </div>

        {!orders?.length ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">Você ainda não fez nenhum pedido.</p>
            <Link href="/loja" className="mt-3 inline-block text-pink-600 font-semibold hover:underline text-sm">
              Ir para a loja
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const statusInfo = STATUS_LABELS[order.status] ?? { label: order.status, color: 'bg-gray-100 text-gray-700' }
              return (
                <div key={order.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{order.order_number}</p>
                    <p className="text-xs text-gray-500">{formatDate(order.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                    <span className="text-sm font-bold text-gray-900">{formatCurrency(order.total)}</span>
                    <Link href={`/conta/pedidos/${order.id}`} className="text-xs text-pink-600 hover:underline">
                      Ver
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/conta/pedidos"
          className="flex items-center gap-4 bg-white border border-gray-100 rounded-2xl shadow-sm p-5 hover:border-pink-200 hover:shadow-md transition-all group"
        >
          <div className="w-12 h-12 bg-pink-50 rounded-xl flex items-center justify-center text-pink-500 group-hover:bg-pink-500 group-hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">Meus Pedidos</p>
            <p className="text-xs text-gray-500">Acompanhe suas compras</p>
          </div>
        </Link>

        <Link
          href="/loja"
          className="flex items-center gap-4 bg-white border border-gray-100 rounded-2xl shadow-sm p-5 hover:border-pink-200 hover:shadow-md transition-all group"
        >
          <div className="w-12 h-12 bg-pink-50 rounded-xl flex items-center justify-center text-pink-500 group-hover:bg-pink-500 group-hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">Continuar Comprando</p>
            <p className="text-xs text-gray-500">Explore nossa loja</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
