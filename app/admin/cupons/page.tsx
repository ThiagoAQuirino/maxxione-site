'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'

interface Coupon {
  id: string
  code: string
  type: string
  value: number
  min_order_value: number
  max_uses: number | null
  used_count: number
  expires_at: string | null
  active: boolean
  created_at: string
}

interface FormState {
  code: string
  type: 'percentage' | 'fixed'
  value: string
  min_order_value: string
  max_uses: string
  expires_at: string
  active: boolean
}

const emptyForm: FormState = {
  code: '',
  type: 'percentage',
  value: '',
  min_order_value: '0',
  max_uses: '',
  expires_at: '',
  active: true,
}

export default function CuponsPage() {
  const supabase = createClient()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCoupons = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false })
    setCoupons(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchCoupons() }, [fetchCoupons])

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setError(null)
    setSaving(true)
    try {
      if (!form.code.trim()) throw new Error('Informe o código do cupom')
      if (!form.value || isNaN(parseFloat(form.value))) throw new Error('Informe o valor do desconto')

      const payload = {
        code: form.code.trim().toUpperCase(),
        type: form.type,
        value: parseFloat(form.value),
        min_order_value: parseFloat(form.min_order_value) || 0,
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        active: form.active,
      }

      const { error: err } = await supabase.from('coupons').insert(payload)
      if (err) throw new Error(err.message)

      setShowModal(false)
      setForm(emptyForm)
      fetchCoupons()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar cupom')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(coupon: Coupon) {
    await supabase.from('coupons').update({ active: !coupon.active }).eq('id', coupon.id)
    fetchCoupons()
  }

  async function deleteCoupon(coupon: Coupon) {
    if (!confirm(`Excluir cupom "${coupon.code}"?`)) return
    await supabase.from('coupons').delete().eq('id', coupon.id)
    fetchCoupons()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Cupons</h1>
        <button
          onClick={() => { setShowModal(true); setError(null); setForm(emptyForm) }}
          className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Novo cupom
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Carregando...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase bg-gray-50">
                  <th className="px-4 py-3 font-medium">Código</th>
                  <th className="px-4 py-3 font-medium">Desconto</th>
                  <th className="px-4 py-3 font-medium">Pedido mín.</th>
                  <th className="px-4 py-3 font-medium">Usos</th>
                  <th className="px-4 py-3 font-medium">Expira em</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {coupons.map((coupon) => (
                  <tr key={coupon.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-semibold text-gray-900">{coupon.code}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {coupon.type === 'percentage'
                        ? `${coupon.value}%`
                        : formatCurrency(coupon.value)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {coupon.min_order_value > 0 ? formatCurrency(coupon.min_order_value) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {coupon.used_count}
                      {coupon.max_uses != null ? ` / ${coupon.max_uses}` : ' / ∞'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {coupon.expires_at ? formatDate(coupon.expires_at) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(coupon)}
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                          coupon.active ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {coupon.active ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => deleteCoupon(coupon)}
                        className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
                {coupons.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-400">Nenhum cupom cadastrado</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 text-lg">Novo Cupom</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código *</label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setField('code', e.target.value.toUpperCase())}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="PROMO10"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                  <select
                    value={form.type}
                    onChange={(e) => setField('type', e.target.value as 'percentage' | 'fixed')}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                  >
                    <option value="percentage">Porcentagem (%)</option>
                    <option value="fixed">Valor fixo (R$)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {form.type === 'percentage' ? 'Desconto (%) *' : 'Desconto (R$) *'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.value}
                    onChange={(e) => setField('value', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder={form.type === 'percentage' ? '10' : '20,00'}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pedido mínimo (R$)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.min_order_value}
                    onChange={(e) => setField('min_order_value', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Máx. de usos</label>
                  <input
                    type="number"
                    min="1"
                    value={form.max_uses}
                    onChange={(e) => setField('max_uses', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder="Ilimitado"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expira em</label>
                <input
                  type="datetime-local"
                  value={form.expires_at}
                  onChange={(e) => setField('expires_at', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => setField('active', !form.active)}
                  className={`relative w-10 h-6 rounded-full transition-colors ${form.active ? 'bg-pink-500' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.active ? 'left-5' : 'left-1'}`} />
                </div>
                <span className="text-sm text-gray-700">Cupom ativo</span>
              </label>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-pink-500 hover:bg-pink-600 disabled:bg-gray-300 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {saving ? 'Salvando...' : 'Criar cupom'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
