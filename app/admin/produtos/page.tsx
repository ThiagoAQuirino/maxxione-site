import Link from 'next/link'
import Image from 'next/image'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { formatCurrency } from '@/lib/utils'
import ProdutosSearch from './ProdutosSearch'

const PAGE_SIZE = 20

interface Props {
  searchParams: Promise<{ q?: string; cat?: string; status?: string; page?: string }>
}

export default async function ProdutosPage({ searchParams }: Props) {
  const params = await searchParams
  const q = params.q ?? ''
  const cat = params.cat ?? ''
  const status = params.status ?? ''
  const page = parseInt(params.page ?? '1', 10)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  // Fetch categories for filter
  const { data: categories } = await supabaseAdmin
    .from('categories')
    .select('id, name')
    .eq('active', true)
    .order('name')

  // Build query
  let query = supabaseAdmin
    .from('products')
    .select(`
      id, name, slug, base_price, active, featured, sku,
      categories:category_id ( id, name ),
      product_images ( url, sort_order ),
      product_variants ( stock )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (q) query = query.ilike('name', `%${q}%`)
  if (cat) query = query.eq('category_id', cat)
  if (status === 'active') query = query.eq('active', true)
  if (status === 'inactive') query = query.eq('active', false)

  const { data: products, count } = await query

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  function buildUrl(overrides: Record<string, string>) {
    const p = new URLSearchParams()
    if (q) p.set('q', q)
    if (cat) p.set('cat', cat)
    if (status) p.set('status', status)
    p.set('page', String(page))
    Object.entries(overrides).forEach(([k, v]) => {
      if (v) p.set(k, v)
      else p.delete(k)
    })
    return `/admin/produtos?${p.toString()}`
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Produtos</h1>
        <Link
          href="/admin/produtos/novo"
          className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Novo produto
        </Link>
      </div>

      {/* Search & filters */}
      <ProdutosSearch categories={categories ?? []} q={q} cat={cat} status={status} />

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase bg-gray-50">
                <th className="px-4 py-3 font-medium">Produto</th>
                <th className="px-4 py-3 font-medium">Categoria</th>
                <th className="px-4 py-3 font-medium">Preço</th>
                <th className="px-4 py-3 font-medium">Estoque</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(products ?? []).map((product) => {
                const images = (product.product_images as { url: string; sort_order: number }[] | null) ?? []
                const sortedImages = [...images].sort((a, b) => a.sort_order - b.sort_order)
                const thumb = sortedImages[0]?.url ?? null
                const variants = (product.product_variants as { stock: number }[] | null) ?? []
                const totalStock = variants.reduce((s, v) => s + v.stock, 0)
                const category = product.categories as { id: string; name: string } | null

                return (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          {thumb ? (
                            <Image src={thumb} alt={product.name} width={48} height={48} className="object-cover w-full h-full" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300 text-xl">📷</div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 max-w-[200px] truncate">{product.name}</p>
                          <p className="text-xs text-gray-400">{product.sku ?? '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{category?.name ?? '—'}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{formatCurrency(product.base_price)}</td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${totalStock === 0 ? 'text-red-600' : totalStock < 5 ? 'text-orange-500' : 'text-gray-900'}`}>
                        {totalStock}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {product.active ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Ativo</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Inativo</span>
                      )}
                      {product.featured && (
                        <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Destaque</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/produtos/${product.id}`}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                        >
                          Editar
                        </Link>
                        <DeleteProductButton productId={product.id} productName={product.name} />
                      </div>
                    </td>
                  </tr>
                )
              })}
              {(products ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">Nenhum produto encontrado</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Página {page} de {totalPages} — {count} produto{count !== 1 ? 's' : ''}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={buildUrl({ page: String(page - 1) })} className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  ← Anterior
                </Link>
              )}
              {page < totalPages && (
                <Link href={buildUrl({ page: String(page + 1) })} className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  Próxima →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Inline delete button (client component)
function DeleteProductButton({ productId, productName }: { productId: string; productName: string }) {
  return (
    <form action={`/api/admin/products/${productId}`} method="DELETE" onSubmit={(e) => {
      if (!confirm(`Excluir "${productName}"?`)) e.preventDefault()
    }}>
      <button
        type="button"
        onClick={async () => {
          if (!confirm(`Excluir "${productName}"?`)) return
          await fetch(`/api/admin/products/${productId}`, { method: 'DELETE' })
          window.location.reload()
        }}
        className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
      >
        Excluir
      </button>
    </form>
  )
}
