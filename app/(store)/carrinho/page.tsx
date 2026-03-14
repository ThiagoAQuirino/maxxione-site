'use client'

import { useState } from 'react'
import { useCartStore } from '@/store/cart'
import { formatCurrency } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'

const FREE_SHIPPING_THRESHOLD = 299

export default function CarrinhoPage() {
  const items = useCartStore((s) => s.items)
  const subtotal = useCartStore((s) => s.subtotal)
  const total = useCartStore((s) => s.total)
  const couponCode = useCartStore((s) => s.couponCode)
  const couponDiscount = useCartStore((s) => s.couponDiscount)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const removeItem = useCartStore((s) => s.removeItem)
  const setCoupon = useCartStore((s) => s.setCoupon)

  const [couponInput, setCouponInput] = useState(couponCode ?? '')
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState('')
  const [couponSuccess, setCouponSuccess] = useState('')

  const [shippingCep, setShippingCep] = useState('')
  const [shippingOptions, setShippingOptions] = useState<{ name: string; price: number; days: number }[]>([])
  const [selectedShipping, setSelectedShipping] = useState<{ name: string; price: number; days: number } | null>(null)
  const [shippingLoading, setShippingLoading] = useState(false)
  const [shippingError, setShippingError] = useState('')

  const progressToFreeShipping = Math.min((subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100)
  const remainingToFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal)

  const formatCep = (v: string) => v.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2').slice(0, 9)

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return
    setCouponLoading(true)
    setCouponError('')
    setCouponSuccess('')
    try {
      const res = await fetch(`/api/cupom?code=${encodeURIComponent(couponInput.trim())}`)
      const data = await res.json()
      if (data.valid) {
        const discount = data.type === 'percentage'
          ? (subtotal * data.value) / 100
          : data.value
        setCoupon(data.code, discount)
        setCouponSuccess(`Cupom "${data.code}" aplicado! Desconto de ${formatCurrency(discount)}`)
      } else {
        setCouponError(data.message ?? 'Cupom inválido.')
        setCoupon(null, 0)
      }
    } catch {
      setCouponError('Erro ao validar o cupom. Tente novamente.')
    } finally {
      setCouponLoading(false)
    }
  }

  const handleRemoveCoupon = () => {
    setCoupon(null, 0)
    setCouponInput('')
    setCouponSuccess('')
    setCouponError('')
  }

  const handleCalculateShipping = async () => {
    const raw = shippingCep.replace(/\D/g, '')
    if (raw.length !== 8) {
      setShippingError('CEP inválido.')
      return
    }
    setShippingLoading(true)
    setShippingError('')
    try {
      const res = await fetch(`/api/frete?cep=${raw}`)
      const data = await res.json()
      setShippingOptions(data.options ?? [])
      if (data.options?.length) setSelectedShipping(data.options[0])
      else setShippingError('Nenhuma opção disponível para este CEP.')
    } catch {
      setShippingError('Erro ao calcular o frete.')
    } finally {
      setShippingLoading(false)
    }
  }

  const shippingCost = selectedShipping?.price ?? 0
  const grandTotal = total + shippingCost

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-24 h-24 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-12 h-12 text-pink-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-2">Seu carrinho está vazio</h1>
        <p className="text-gray-500 mb-8">Adicione produtos incríveis da nossa loja e volte aqui para finalizar sua compra.</p>
        <Link
          href="/loja"
          className="inline-flex items-center gap-2 bg-pink-500 hover:bg-pink-600 text-white font-bold px-8 py-4 rounded-2xl transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Ver Loja
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-black text-gray-900 mb-8">Meu Carrinho</h1>

      {/* Free shipping progress */}
      <div className="bg-pink-50 border border-pink-100 rounded-2xl p-4 mb-6">
        <div className="flex justify-between text-sm mb-2">
          {remainingToFreeShipping > 0 ? (
            <p className="text-gray-700">
              Falta <span className="font-bold text-pink-600">{formatCurrency(remainingToFreeShipping)}</span> para frete grátis!
            </p>
          ) : (
            <p className="text-green-700 font-semibold">Você ganhou frete grátis!</p>
          )}
          <span className="text-gray-500 font-medium">{Math.round(progressToFreeShipping)}%</span>
        </div>
        <div className="h-2 bg-pink-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-pink-500 rounded-full transition-all duration-500"
            style={{ width: `${progressToFreeShipping}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Cart items */}
        <div className="flex-1 space-y-4">
          {items.map((item) => (
            <div key={item.id} className="flex gap-4 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              {/* Image */}
              <Link href={`/produto/${item.slug}`} className="flex-shrink-0">
                <div className="relative w-20 h-24 rounded-xl overflow-hidden bg-gray-100">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-pink-100 to-pink-200 flex items-center justify-center">
                      <span className="text-pink-300 text-xs font-bold">M1</span>
                    </div>
                  )}
                </div>
              </Link>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <Link href={`/produto/${item.slug}`}>
                  <h3 className="text-sm font-semibold text-gray-900 hover:text-pink-600 transition-colors line-clamp-2">
                    {item.name}
                  </h3>
                </Link>
                {item.variantDescription && (
                  <p className="text-xs text-gray-500 mt-0.5">{item.variantDescription}</p>
                )}
                <p className="text-sm font-bold text-pink-600 mt-1">{formatCurrency(item.price)}</p>

                <div className="flex items-center gap-3 mt-3">
                  {/* Quantity */}
                  <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
                      aria-label="Diminuir quantidade"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                      </svg>
                    </button>
                    <span className="w-8 text-center text-sm font-semibold text-gray-900">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
                      aria-label="Aumentar quantidade"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Remover
                  </button>
                </div>
              </div>

              {/* Subtotal */}
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-gray-900">{formatCurrency(item.price * item.quantity)}</p>
              </div>
            </div>
          ))}

          <Link
            href="/loja"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-pink-600 transition-colors mt-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Continuar comprando
          </Link>
        </div>

        {/* Order summary */}
        <div className="lg:w-96 space-y-4">
          {/* Coupon */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <p className="text-sm font-semibold text-gray-700 mb-3">Cupom de desconto</p>
            {couponCode ? (
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                <span className="text-sm text-green-700 font-semibold">{couponCode}</span>
                <button onClick={handleRemoveCoupon} className="text-xs text-red-500 hover:text-red-700 font-medium">
                  Remover
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="Digite o cupom"
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                />
                <button
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !couponInput.trim()}
                  className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                  {couponLoading ? '...' : 'Aplicar'}
                </button>
              </div>
            )}
            {couponError && <p className="mt-1.5 text-xs text-red-500">{couponError}</p>}
            {couponSuccess && <p className="mt-1.5 text-xs text-green-600">{couponSuccess}</p>}
          </div>

          {/* Shipping calculator */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <p className="text-sm font-semibold text-gray-700 mb-3">Calcular frete</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={shippingCep}
                onChange={(e) => setShippingCep(formatCep(e.target.value))}
                placeholder="00000-000"
                maxLength={9}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                onKeyDown={(e) => e.key === 'Enter' && handleCalculateShipping()}
              />
              <button
                onClick={handleCalculateShipping}
                disabled={shippingLoading}
                className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                {shippingLoading ? '...' : 'OK'}
              </button>
            </div>
            {shippingError && <p className="mt-1.5 text-xs text-red-500">{shippingError}</p>}
            {shippingOptions.length > 0 && (
              <ul className="mt-3 space-y-2">
                {shippingOptions.map((opt, i) => (
                  <li key={i}>
                    <label className="flex items-center justify-between cursor-pointer">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="shipping"
                          checked={selectedShipping?.name === opt.name}
                          onChange={() => setSelectedShipping(opt)}
                          className="accent-pink-500"
                        />
                        <span className="text-sm text-gray-700 font-medium">{opt.name}</span>
                        <span className="text-xs text-gray-400">{opt.days}d</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-700">
                        {opt.price === 0 ? <span className="text-green-600">Grátis</span> : formatCurrency(opt.price)}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Summary */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-3">
            <h2 className="text-base font-bold text-gray-900">Resumo do pedido</h2>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium text-gray-900">{formatCurrency(subtotal)}</span>
              </div>
              {couponDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Desconto ({couponCode})</span>
                  <span className="font-semibold">-{formatCurrency(couponDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Frete</span>
                <span className={`font-medium ${shippingCost === 0 && selectedShipping ? 'text-green-600' : 'text-gray-900'}`}>
                  {selectedShipping
                    ? shippingCost === 0
                      ? 'Grátis'
                      : formatCurrency(shippingCost)
                    : 'Calcule acima'}
                </span>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-3 flex justify-between">
              <span className="font-bold text-gray-900">Total</span>
              <span className="font-black text-xl text-pink-600">{formatCurrency(grandTotal)}</span>
            </div>

            <Link
              href="/checkout"
              className="block w-full text-center bg-pink-500 hover:bg-pink-600 text-white font-bold py-4 rounded-2xl transition-colors text-base"
            >
              Finalizar Compra
            </Link>

            <p className="text-center text-xs text-gray-400">
              Pagamento 100% seguro via Mercado Pago
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
