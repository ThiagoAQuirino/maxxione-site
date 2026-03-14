'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

interface CsvRow {
  order_number: string
  date: string
  customer: string
  email: string
  items: number
  total: number
  payment_status: string
  status: string
}

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'pending', label: 'Pendente' },
  { value: 'paid', label: 'Pago' },
  { value: 'processing', label: 'Processando' },
  { value: 'shipped', label: 'Enviado' },
  { value: 'delivered', label: 'Entregue' },
  { value: 'cancelled', label: 'Cancelado' },
  { value: 'refunded', label: 'Reembolsado' },
]

interface Props {
  csvData: CsvRow[]
  q: string
  status: string
}

export default function PedidosSearch({ csvData, q, status }: Props) {
  const router = useRouter()

  const update = useCallback((overrides: Record<string, string>) => {
    const p = new URLSearchParams()
    if (q) p.set('q', q)
    if (status) p.set('status', status)
    p.delete('page')
    Object.entries(overrides).forEach(([k, v]) => {
      if (v) p.set(k, v)
      else p.delete(k)
    })
    router.push(`/admin/pedidos?${p.toString()}`)
  }, [q, status, router])

  function exportCsv() {
    const headers = ['Pedido', 'Data', 'Cliente', 'Email', 'Itens', 'Total (R$)', 'Pagamento', 'Status']
    const rows = csvData.map((r) => [
      r.order_number, r.date, r.customer, r.email,
      r.items, r.total.toFixed(2).replace('.', ','),
      r.payment_status, r.status,
    ])
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(';')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pedidos-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        type="text"
        placeholder="Buscar por nº pedido ou e-mail..."
        defaultValue={q}
        onChange={(e) => update({ q: e.target.value })}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 w-64"
      />
      <select
        value={status}
        onChange={(e) => update({ status: e.target.value })}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <button
        onClick={exportCsv}
        className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
      >
        Exportar CSV
      </button>
    </div>
  )
}
