'use client'

import { useState } from 'react'
import Image from 'next/image'

interface GalleryImage {
  url: string
  alt: string | null
}

interface ProductGalleryProps {
  images: GalleryImage[]
}

export default function ProductGallery({ images }: ProductGalleryProps) {
  const [selected, setSelected] = useState(0)
  const [zoomed, setZoomed] = useState(false)

  const current = images[selected]

  if (!images.length) {
    return (
      <div className="aspect-square bg-gradient-to-br from-pink-100 to-pink-200 rounded-2xl flex items-center justify-center">
        <span className="text-pink-300 text-6xl font-black">M1</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Main image */}
      <div
        className="relative pb-[100%] bg-gray-100 rounded-2xl overflow-hidden cursor-zoom-in"
        onClick={() => setZoomed(true)}
      >
        <Image
          src={current.url}
          alt={current.alt ?? 'Imagem do produto'}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
        />
        <button
          className="absolute top-3 right-3 bg-white/80 backdrop-blur-sm rounded-full p-2 text-gray-600 hover:text-gray-900 transition-colors"
          onClick={(e) => { e.stopPropagation(); setZoomed(true) }}
          aria-label="Ampliar imagem"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
          </svg>
        </button>
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setSelected(idx)}
              className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors ${
                idx === selected ? 'border-pink-500' : 'border-transparent hover:border-gray-300'
              }`}
            >
              <div className="relative w-full h-full">
                <Image
                  src={img.url}
                  alt={img.alt ?? `Imagem ${idx + 1}`}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Zoom modal */}
      {zoomed && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setZoomed(false)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
            onClick={() => setZoomed(false)}
            aria-label="Fechar"
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Prev */}
          {images.length > 1 && selected > 0 && (
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors"
              onClick={(e) => { e.stopPropagation(); setSelected(selected - 1) }}
              aria-label="Anterior"
            >
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          <div
            className="relative max-w-2xl w-full max-h-[80vh] aspect-square"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={current.url}
              alt={current.alt ?? 'Imagem ampliada'}
              fill
              sizes="(max-width: 768px) 100vw, 672px"
              className="object-contain"
            />
          </div>

          {/* Next */}
          {images.length > 1 && selected < images.length - 1 && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors"
              onClick={(e) => { e.stopPropagation(); setSelected(selected + 1) }}
              aria-label="Próxima"
            >
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
