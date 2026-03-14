'use client'

import { Database } from '@/lib/supabase/types'

type ProductVariant = Database['public']['Tables']['product_variants']['Row']

interface VariantSelectorProps {
  variants: ProductVariant[]
  onSelect: (variant: ProductVariant) => void
  selectedId: string | null
}

export default function VariantSelector({ variants, onSelect, selectedId }: VariantSelectorProps) {
  if (!variants.length) return null

  const sizes = Array.from(new Set(variants.filter((v) => v.size).map((v) => v.size!)))
  const colors = Array.from(
    new Map(
      variants
        .filter((v) => v.color && v.color_hex)
        .map((v) => [v.color!, { color: v.color!, hex: v.color_hex! }])
    ).values()
  )

  const selectedVariant = variants.find((v) => v.id === selectedId) ?? null

  const isOutOfStock = (variant: ProductVariant) => variant.stock <= 0 || !variant.active

  const handleSizeClick = (size: string) => {
    const colorFilter = selectedVariant?.color ?? null
    const match =
      variants.find((v) => v.size === size && v.color === colorFilter && v.active && v.stock > 0) ??
      variants.find((v) => v.size === size && v.active && v.stock > 0) ??
      variants.find((v) => v.size === size)
    if (match) onSelect(match)
  }

  const handleColorClick = (color: string) => {
    const sizeFilter = selectedVariant?.size ?? null
    const match =
      variants.find((v) => v.color === color && v.size === sizeFilter && v.active && v.stock > 0) ??
      variants.find((v) => v.color === color && v.active && v.stock > 0) ??
      variants.find((v) => v.color === color)
    if (match) onSelect(match)
  }

  const sizeOrder = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XGG', '2XG', '3XG']

  const sortedSizes = [...sizes].sort((a, b) => {
    const ai = sizeOrder.indexOf(a.toUpperCase())
    const bi = sizeOrder.indexOf(b.toUpperCase())
    if (ai >= 0 && bi >= 0) return ai - bi
    if (ai >= 0) return -1
    if (bi >= 0) return 1
    return a.localeCompare(b)
  })

  return (
    <div className="space-y-5">
      {/* Sizes */}
      {sortedSizes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">
              Tamanho
              {selectedVariant?.size && (
                <span className="ml-2 text-pink-600">{selectedVariant.size}</span>
              )}
            </span>
            <button className="text-xs text-gray-400 hover:text-pink-600 transition-colors underline underline-offset-2">
              Guia de tamanhos
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {sortedSizes.map((size) => {
              const variantsForSize = variants.filter((v) => v.size === size)
              const hasStock = variantsForSize.some((v) => v.stock > 0 && v.active)
              const isSelected = selectedVariant?.size === size

              return (
                <button
                  key={size}
                  onClick={() => hasStock && handleSizeClick(size)}
                  disabled={!hasStock}
                  className={`w-12 h-12 rounded-xl text-sm font-semibold border-2 transition-all ${
                    isSelected
                      ? 'border-pink-500 bg-pink-500 text-white'
                      : hasStock
                      ? 'border-gray-200 text-gray-700 hover:border-pink-400 hover:text-pink-600 bg-white'
                      : 'border-gray-100 text-gray-300 bg-gray-50 cursor-not-allowed line-through'
                  }`}
                >
                  {size}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Colors */}
      {colors.length > 0 && (
        <div>
          <span className="text-sm font-semibold text-gray-700 block mb-2">
            Cor
            {selectedVariant?.color && (
              <span className="ml-2 text-pink-600">{selectedVariant.color}</span>
            )}
          </span>
          <div className="flex flex-wrap gap-2.5">
            {colors.map(({ color, hex }) => {
              const variantsForColor = variants.filter((v) => v.color === color)
              const hasStock = variantsForColor.some((v) => v.stock > 0 && v.active)
              const isSelected = selectedVariant?.color === color

              return (
                <button
                  key={color}
                  onClick={() => hasStock && handleColorClick(color)}
                  disabled={!hasStock}
                  title={color}
                  aria-label={color}
                  className={`w-9 h-9 rounded-full border-2 transition-all ${
                    isSelected
                      ? 'border-pink-500 scale-110 ring-2 ring-pink-300'
                      : hasStock
                      ? 'border-white shadow hover:scale-105 hover:ring-2 hover:ring-gray-300'
                      : 'border-white opacity-40 cursor-not-allowed'
                  }`}
                  style={{ backgroundColor: hex }}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Stock warning */}
      {selectedVariant && (
        <div>
          {isOutOfStock(selectedVariant) ? (
            <p className="text-sm text-red-500 font-medium">Esgotado</p>
          ) : selectedVariant.stock <= 5 ? (
            <p className="text-sm text-amber-600 font-medium">
              Apenas {selectedVariant.stock} restante{selectedVariant.stock !== 1 ? 's' : ''}
            </p>
          ) : null}
        </div>
      )}
    </div>
  )
}
