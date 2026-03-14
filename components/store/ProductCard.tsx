'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'

interface ProductCardProps {
  product: {
    id: string
    name: string
    slug: string
    base_price: number
    compare_price?: number | null
    image_url?: string | null
    tags?: string[] | null
  }
}

export default function ProductCard({ product }: ProductCardProps) {
  const [wishlisted, setWishlisted] = useState(false)
  const hasDiscount =
    product.compare_price != null && product.compare_price > product.base_price
  const discountPercent = hasDiscount
    ? Math.round(
        ((product.compare_price! - product.base_price) /
          product.compare_price!) *
          100
      )
    : 0

  return (
    <div className="group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 border border-gray-100">
      {/* Image wrapper */}
      <Link href={`/produto/${product.slug}`} className="block relative pb-[133%] overflow-hidden bg-gray-100">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-pink-100 via-pink-200 to-pink-300 flex items-center justify-center">
            <span className="text-pink-400 text-4xl font-black tracking-widest opacity-40">M1</span>
          </div>
        )}

        {/* Discount badge */}
        {hasDiscount && (
          <span className="absolute top-3 left-3 bg-pink-500 text-white text-xs font-bold px-2.5 py-1 rounded-full z-10">
            -{discountPercent}%
          </span>
        )}

        {/* Tags */}
        {product.tags && product.tags.includes('novo') && !hasDiscount && (
          <span className="absolute top-3 left-3 bg-gray-900 text-white text-xs font-bold px-2.5 py-1 rounded-full z-10">
            Novo
          </span>
        )}
      </Link>

      {/* Wishlist button */}
      <button
        onClick={() => setWishlisted((v) => !v)}
        aria-label={wishlisted ? 'Remover da lista de desejos' : 'Adicionar à lista de desejos'}
        className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center bg-white rounded-full shadow-sm hover:scale-110 transition-transform"
      >
        <svg
          className={`w-4 h-4 transition-colors ${wishlisted ? 'fill-pink-500 text-pink-500' : 'fill-none text-gray-400'}`}
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
      </button>

      {/* Info */}
      <div className="p-4">
        <Link href={`/produto/${product.slug}`}>
          <h3 className="text-gray-900 font-semibold text-sm leading-tight line-clamp-2 hover:text-pink-600 transition-colors mb-2">
            {product.name}
          </h3>
        </Link>

        <div className="flex items-center gap-2 mb-3">
          <span className="text-pink-600 font-bold text-base">
            {formatCurrency(product.base_price)}
          </span>
          {hasDiscount && (
            <span className="text-gray-400 text-sm line-through">
              {formatCurrency(product.compare_price!)}
            </span>
          )}
        </div>

        <Link
          href={`/produto/${product.slug}`}
          className="block w-full text-center bg-pink-500 hover:bg-pink-600 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
        >
          Ver produto
        </Link>
      </div>
    </div>
  )
}
