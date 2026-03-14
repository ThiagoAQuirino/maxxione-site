'use client'

import { useState } from 'react'
import { useCartStore } from '@/store/cart'
import { Database } from '@/lib/supabase/types'

type ProductVariant = Database['public']['Tables']['product_variants']['Row']

interface AddToCartButtonProps {
  product: {
    id: string
    name: string
    slug: string
    base_price: number
    image_url?: string | null
  }
  selectedVariant: ProductVariant | null
  quantity: number
}

export default function AddToCartButton({ product, selectedVariant, quantity }: AddToCartButtonProps) {
  const addItem = useCartStore((s) => s.addItem)
  const [added, setAdded] = useState(false)
  const [error, setError] = useState('')

  const handleAdd = () => {
    setError('')

    // Determine if we need a variant
    if (selectedVariant === null) {
      setError('Selecione um tamanho ou cor antes de adicionar ao carrinho.')
      return
    }

    if (selectedVariant.stock <= 0 || !selectedVariant.active) {
      setError('Variante selecionada está esgotada.')
      return
    }

    const variantParts = [selectedVariant.size, selectedVariant.color].filter(Boolean)
    const variantDescription = variantParts.length ? variantParts.join(' / ') : null

    addItem({
      id: selectedVariant.id,
      productId: product.id,
      variantId: selectedVariant.id,
      name: product.name,
      variantDescription,
      price: selectedVariant.price_override ?? product.base_price,
      image: product.image_url ?? null,
      quantity,
      slug: product.slug,
    })

    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleAdd}
        className={`w-full py-4 rounded-2xl font-bold text-base transition-all duration-200 flex items-center justify-center gap-2 ${
          added
            ? 'bg-green-500 text-white'
            : 'bg-pink-500 hover:bg-pink-600 active:scale-95 text-white'
        }`}
      >
        {added ? (
          <>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Adicionado!
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Adicionar ao Carrinho
          </>
        )}
      </button>
      {error && (
        <p className="text-sm text-red-500 font-medium text-center">{error}</p>
      )}
    </div>
  )
}
