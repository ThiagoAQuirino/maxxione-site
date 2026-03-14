'use client'

import { useState } from 'react'
import { Database } from '@/lib/supabase/types'
import VariantSelector from './VariantSelector'
import AddToCartButton from './AddToCartButton'
import ShippingCalculator from './ShippingCalculator'
import { formatCurrency } from '@/lib/utils'

type ProductVariant = Database['public']['Tables']['product_variants']['Row']

interface ProductActionsProps {
  product: {
    id: string
    name: string
    slug: string
    base_price: number
    compare_price: number | null
    image_url?: string | null
  }
  variants: ProductVariant[]
}

export default function ProductActions({ product, variants }: ProductActionsProps) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    variants.length === 1 ? variants[0] : null
  )
  const [quantity, setQuantity] = useState(1)

  const hasVariants = variants.length > 0
  const currentPrice = selectedVariant?.price_override ?? product.base_price
  const hasDiscount = product.compare_price != null && product.compare_price > product.base_price
  const discountPercent = hasDiscount
    ? Math.round(((product.compare_price! - product.base_price) / product.compare_price!) * 100)
    : 0

  const maxQty = selectedVariant ? selectedVariant.stock : 99

  return (
    <div className="space-y-6">
      {/* Price */}
      <div className="flex items-center gap-3">
        <span className="text-3xl font-black text-gray-900">{formatCurrency(currentPrice)}</span>
        {hasDiscount && (
          <>
            <span className="text-lg text-gray-400 line-through">{formatCurrency(product.compare_price!)}</span>
            <span className="bg-pink-500 text-white text-sm font-bold px-2.5 py-1 rounded-full">
              -{discountPercent}%
            </span>
          </>
        )}
      </div>

      {/* Installments hint */}
      <p className="text-sm text-gray-500">
        ou em até <span className="font-semibold text-gray-700">3x de {formatCurrency(currentPrice / 3)}</span> sem juros
      </p>

      {/* Variant selector */}
      {hasVariants && (
        <VariantSelector
          variants={variants}
          onSelect={setSelectedVariant}
          selectedId={selectedVariant?.id ?? null}
        />
      )}

      {/* Quantity */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-semibold text-gray-700">Quantidade</span>
        <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
            aria-label="Diminuir"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
            </svg>
          </button>
          <span className="w-12 text-center text-sm font-semibold text-gray-900">{quantity}</span>
          <button
            onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
            className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
            aria-label="Aumentar"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Add to cart */}
      <AddToCartButton
        product={product}
        selectedVariant={hasVariants ? selectedVariant : ({ id: product.id, product_id: product.id, size: null, color: null, color_hex: null, sku: null, price_override: null, stock: 99, active: true, created_at: '', updated_at: '' } as ProductVariant)}
        quantity={quantity}
      />

      {/* Shipping */}
      <ShippingCalculator />
    </div>
  )
}
