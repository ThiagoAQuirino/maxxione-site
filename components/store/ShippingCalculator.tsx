'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/utils'

interface ShippingOption {
  name: string
  price: number
  days: number
}

export default function ShippingCalculator() {
  const [cep, setCep] = useState('')
  const [options, setOptions] = useState<ShippingOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const formatCep = (value: string) => {
    return value.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2').slice(0, 9)
  }

  const handleCalculate = async () => {
    const rawCep = cep.replace(/\D/g, '')
    if (rawCep.length !== 8) {
      setError('CEP inválido. Digite os 8 dígitos.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`/api/frete?cep=${rawCep}`)
      if (!res.ok) throw new Error('Erro ao calcular frete')
      const data = await res.json()
      setOptions(data.options ?? [])
      if (!data.options?.length) setError('Nenhuma opção de frete disponível para este CEP.')
    } catch {
      setError('Não foi possível calcular o frete. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border border-gray-200 rounded-2xl p-4">
      <p className="text-sm font-semibold text-gray-700 mb-3">Calcular frete</p>
      <div className="flex gap-2">
        <input
          type="text"
          value={cep}
          onChange={(e) => setCep(formatCep(e.target.value))}
          placeholder="00000-000"
          maxLength={9}
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
          onKeyDown={(e) => e.key === 'Enter' && handleCalculate()}
        />
        <button
          onClick={handleCalculate}
          disabled={loading}
          className="px-4 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Calculando...' : 'Calcular'}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      {options.length > 0 && (
        <ul className="mt-3 space-y-2">
          {options.map((opt, i) => (
            <li key={i} className="flex items-center justify-between text-sm">
              <span className="text-gray-700 font-medium">{opt.name}</span>
              <span className="text-gray-500">
                {opt.price === 0 ? (
                  <span className="text-green-600 font-semibold">Grátis</span>
                ) : (
                  formatCurrency(opt.price)
                )}{' '}
                · {opt.days} dia{opt.days !== 1 ? 's' : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
      <a
        href="https://buscacepinter.correios.com.br/"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 block text-xs text-gray-400 hover:text-pink-500 transition-colors"
      >
        Não sei meu CEP
      </a>
    </div>
  )
}
