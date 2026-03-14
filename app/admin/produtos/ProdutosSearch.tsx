'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

interface Category {
  id: string
  name: string
}

interface Props {
  categories: Category[]
  q: string
  cat: string
  status: string
}

export default function ProdutosSearch({ categories, q, cat, status }: Props) {
  const router = useRouter()

  const update = useCallback((overrides: Record<string, string>) => {
    const p = new URLSearchParams()
    if (q) p.set('q', q)
    if (cat) p.set('cat', cat)
    if (status) p.set('status', status)
    p.delete('page')
    Object.entries(overrides).forEach(([k, v]) => {
      if (v) p.set(k, v)
      else p.delete(k)
    })
    router.push(`/admin/produtos?${p.toString()}`)
  }, [q, cat, status, router])

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-wrap items-center gap-3">
      <input
        type="text"
        placeholder="Buscar produto..."
        defaultValue={q}
        onChange={(e) => update({ q: e.target.value })}
        className="flex-1 min-w-[200px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
      />
      <select
        value={cat}
        onChange={(e) => update({ cat: e.target.value })}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
      >
        <option value="">Todas as categorias</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <select
        value={status}
        onChange={(e) => update({ status: e.target.value })}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
      >
        <option value="">Todos os status</option>
        <option value="active">Ativo</option>
        <option value="inactive">Inativo</option>
      </select>
      {(q || cat || status) && (
        <button
          onClick={() => router.push('/admin/produtos')}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Limpar filtros
        </button>
      )}
    </div>
  )
}
