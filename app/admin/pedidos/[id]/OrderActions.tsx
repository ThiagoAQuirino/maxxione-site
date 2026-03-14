'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const STATUS_OPTIONS = [
  { value: 'pending',    label: 'Pendente' },
  { value: 'paid',       label: 'Pago' },
  { value: 'processing', label: 'Processando' },
  { value: 'shipped',    label: 'Enviado' },
  { value: 'delivered',  label: 'Entregue' },
  { value: 'cancelled',  label: 'Cancelado' },
  { value: 'refunded',   label: 'Reembolsado' },
]

interface Props {
  orderId: string
  currentStatus: string
  currentTracking: string
}

export default function OrderActions({ orderId, currentStatus, currentTracking }: Props) {
  const router = useRouter()
  const [status, setStatus] = useState(currentStatus)
  const [tracking, setTracking] = useState(currentTracking)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, tracking_code: tracking || undefined, notes: notes || undefined }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Erro ao atualizar pedido')
      }
      setSuccess(true)
      setNotes('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-5 py-4 space-y-4">
      <h2 className="font-semibold text-gray-900">Atualizar Pedido</h2>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Código de rastreio</label>
        <input
          type="text"
          value={tracking}
          onChange={(e) => setTracking(e.target.value)}
          placeholder="BR123456789BR"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Observações (opcional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Ex: Pedido enviado via Sedex..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
        />
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
      )}
      {success && (
        <p className="text-xs text-green-600 bg-green-50 border border-green-200 rounded px-3 py-2">Pedido atualizado com sucesso!</p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-pink-500 hover:bg-pink-600 disabled:bg-gray-300 text-white py-2 rounded-lg text-sm font-medium transition-colors"
      >
        {saving ? 'Salvando...' : 'Salvar alterações'}
      </button>
    </div>
  )
}
