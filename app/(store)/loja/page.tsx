import { createClient } from '@/lib/supabase/server'
import ProductCard from '@/components/store/ProductCard'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Loja | MaxxiOne Fitness e Praia',
  description: 'Explore nossa coleção de moda fitness e praia em Maringá-PR.',
}

const ITEMS_PER_PAGE = 12

interface PageProps {
  searchParams: Promise<{
    q?: string
    categoria?: string
    sort?: string
    page?: string
  }>
}

export default async function LojaPage({ searchParams }: PageProps) {
  const params = await searchParams
  const query = params.q?.trim() ?? ''
  const categoriaSlug = params.categoria ?? ''
  const sort = params.sort ?? 'relevancia'
  const page = Math.max(1, parseInt(params.page ?? '1', 10))
  const offset = (page - 1) * ITEMS_PER_PAGE

  const supabase = await createClient()

  // Fetch categories
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug')
    .eq('active', true)
    .order('sort_order')

  // Build products query
  let productsQuery = supabase
    .from('products')
    .select(
      `id, name, slug, base_price, compare_price, tags, category_id,
       product_images(url, alt, sort_order)`,
      { count: 'exact' }
    )
    .eq('active', true)

  if (query) {
    productsQuery = productsQuery.ilike('name', `%${query}%`)
  }

  if (categoriaSlug) {
    const cat = categories?.find((c) => c.slug === categoriaSlug)
    if (cat) {
      productsQuery = productsQuery.eq('category_id', cat.id)
    }
  }

  if (sort === 'menor-preco') {
    productsQuery = productsQuery.order('base_price', { ascending: true })
  } else if (sort === 'maior-preco') {
    productsQuery = productsQuery.order('base_price', { ascending: false })
  } else if (sort === 'novidades') {
    productsQuery = productsQuery.order('created_at', { ascending: false })
  } else if (sort === 'desconto') {
    productsQuery = productsQuery.not('compare_price', 'is', null).order('base_price', { ascending: true })
  } else {
    productsQuery = productsQuery.order('featured', { ascending: false }).order('created_at', { ascending: false })
  }

  productsQuery = productsQuery.range(offset, offset + ITEMS_PER_PAGE - 1)

  const { data: products, count } = await productsQuery

  const totalPages = Math.ceil((count ?? 0) / ITEMS_PER_PAGE)

  // Map first image
  const mappedProducts = (products ?? []).map((p) => {
    const images = (p.product_images as { url: string; alt: string | null; sort_order: number }[]) ?? []
    const sorted = [...images].sort((a, b) => a.sort_order - b.sort_order)
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      base_price: p.base_price,
      compare_price: p.compare_price,
      image_url: sorted[0]?.url ?? null,
      tags: p.tags,
    }
  })

  const buildUrl = (overrides: Record<string, string>) => {
    const next = new URLSearchParams()
    if (query) next.set('q', query)
    if (categoriaSlug) next.set('categoria', categoriaSlug)
    if (sort !== 'relevancia') next.set('sort', sort)
    next.set('page', String(page))
    Object.entries(overrides).forEach(([k, v]) => {
      if (v) next.set(k, v)
      else next.delete(k)
    })
    const str = next.toString()
    return `/loja${str ? `?${str}` : ''}`
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Loja</h1>
          {count != null && (
            <p className="text-sm text-gray-500 mt-0.5">{count} produto{count !== 1 ? 's' : ''} encontrado{count !== 1 ? 's' : ''}</p>
          )}
        </div>

        {/* Sort */}
        <form method="GET" action="/loja" className="flex items-center gap-2">
          {query && <input type="hidden" name="q" value={query} />}
          {categoriaSlug && <input type="hidden" name="categoria" value={categoriaSlug} />}
          <label className="text-sm text-gray-500 font-medium whitespace-nowrap">Ordenar por</label>
          <select
            name="sort"
            defaultValue={sort}
            onChange={(e) => {
              // handled by form submit via button below
            }}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
          >
            <option value="relevancia">Relevância</option>
            <option value="menor-preco">Menor preço</option>
            <option value="maior-preco">Maior preço</option>
            <option value="novidades">Novidades</option>
            <option value="desconto">Promoções</option>
          </select>
          <button type="submit" className="sr-only">Aplicar</button>
        </form>
      </div>

      <div className="flex gap-8">
        {/* Sidebar */}
        <aside className="hidden lg:block w-56 flex-shrink-0">
          {/* Search */}
          <div className="mb-6">
            <form method="GET" action="/loja">
              {categoriaSlug && <input type="hidden" name="categoria" value={categoriaSlug} />}
              {sort !== 'relevancia' && <input type="hidden" name="sort" value={sort} />}
              <div className="relative">
                <input
                  type="text"
                  name="q"
                  defaultValue={query}
                  placeholder="Buscar produtos..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
                <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-pink-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </form>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Categorias</h3>
            <ul className="space-y-1">
              <li>
                <Link
                  href={buildUrl({ categoria: '', page: '1' })}
                  className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    !categoriaSlug
                      ? 'bg-pink-50 text-pink-600 font-semibold'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  Todas
                </Link>
              </li>
              {(categories ?? []).map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={buildUrl({ categoria: cat.slug, page: '1' })}
                    className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      categoriaSlug === cat.slug
                        ? 'bg-pink-50 text-pink-600 font-semibold'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 min-w-0">
          {/* Mobile search */}
          <div className="lg:hidden mb-4">
            <form method="GET" action="/loja" className="flex gap-2">
              {categoriaSlug && <input type="hidden" name="categoria" value={categoriaSlug} />}
              {sort !== 'relevancia' && <input type="hidden" name="sort" value={sort} />}
              <input
                type="text"
                name="q"
                defaultValue={query}
                placeholder="Buscar produtos..."
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
              <button type="submit" className="bg-pink-500 text-white px-4 rounded-xl hover:bg-pink-600 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </form>
          </div>

          {/* Mobile categories scroll */}
          <div className="lg:hidden flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
            <Link
              href={buildUrl({ categoria: '', page: '1' })}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                !categoriaSlug
                  ? 'bg-pink-500 text-white border-pink-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-pink-300'
              }`}
            >
              Todas
            </Link>
            {(categories ?? []).map((cat) => (
              <Link
                key={cat.id}
                href={buildUrl({ categoria: cat.slug, page: '1' })}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  categoriaSlug === cat.slug
                    ? 'bg-pink-500 text-white border-pink-500'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-pink-300'
                }`}
              >
                {cat.name}
              </Link>
            ))}
          </div>

          {/* Grid */}
          {mappedProducts.length === 0 ? (
            <div className="text-center py-20">
              <svg className="w-16 h-16 text-gray-200 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-500 text-lg font-medium">Nenhum produto encontrado</p>
              <p className="text-gray-400 text-sm mt-1">Tente outros filtros ou busque por outro termo.</p>
              <Link href="/loja" className="mt-4 inline-block text-pink-600 font-semibold hover:underline">
                Ver todos os produtos
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {mappedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-10 flex justify-center items-center gap-2">
              {page > 1 && (
                <Link
                  href={buildUrl({ page: String(page - 1) })}
                  className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 text-gray-600 hover:border-pink-500 hover:text-pink-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </Link>
              )}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .map((p, idx, arr) => {
                  const showDots = idx > 0 && p - arr[idx - 1] > 1
                  return (
                    <span key={p} className="flex items-center gap-2">
                      {showDots && <span className="text-gray-400">…</span>}
                      <Link
                        href={buildUrl({ page: String(p) })}
                        className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-semibold transition-colors ${
                          p === page
                            ? 'bg-pink-500 text-white'
                            : 'border border-gray-200 text-gray-600 hover:border-pink-500 hover:text-pink-600'
                        }`}
                      >
                        {p}
                      </Link>
                    </span>
                  )
                })}
              {page < totalPages && (
                <Link
                  href={buildUrl({ page: String(page + 1) })}
                  className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 text-gray-600 hover:border-pink-500 hover:text-pink-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
