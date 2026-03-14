import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import ProductGallery from '@/components/store/ProductGallery'
import ProductActions from '@/components/store/ProductActions'
import ProductCard from '@/components/store/ProductCard'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data: product } = await supabase
    .from('products')
    .select('name, description')
    .eq('slug', slug)
    .eq('active', true)
    .single()

  if (!product) {
    return { title: 'Produto não encontrado | MaxxiOne' }
  }

  return {
    title: `${product.name} | MaxxiOne`,
    description: product.description ?? `Compre ${product.name} na MaxxiOne. Moda fitness e praia em Maringá-PR.`,
    openGraph: {
      title: `${product.name} | MaxxiOne`,
      description: product.description ?? '',
    },
  }
}

export default async function ProdutoPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: product } = await supabase
    .from('products')
    .select(`
      id, name, slug, description, base_price, compare_price, tags, category_id, weight, sku,
      product_images(id, url, alt, sort_order),
      product_variants(id, product_id, size, color, color_hex, sku, price_override, stock, active, created_at, updated_at)
    `)
    .eq('slug', slug)
    .eq('active', true)
    .single()

  if (!product) notFound()

  // Sort images by sort_order
  const images = [...(product.product_images ?? [])].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  )

  // Filter active variants
  const variants = (product.product_variants ?? []).filter((v) => v.active)

  // Fetch related products from same category
  let relatedProducts: Array<{
    id: string
    name: string
    slug: string
    base_price: number
    compare_price: number | null
    image_url: string | null
    tags: string[] | null
  }> = []

  if (product.category_id) {
    const { data: related } = await supabase
      .from('products')
      .select(`
        id, name, slug, base_price, compare_price, tags,
        product_images(url, sort_order)
      `)
      .eq('active', true)
      .eq('category_id', product.category_id)
      .neq('id', product.id)
      .limit(4)

    relatedProducts = (related ?? []).map((p) => {
      const imgs = [...(p.product_images ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        base_price: p.base_price,
        compare_price: p.compare_price,
        image_url: imgs[0]?.url ?? null,
        tags: p.tags,
      }
    })
  }

  const productForActions = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    base_price: product.base_price,
    compare_price: product.compare_price,
    image_url: images[0]?.url ?? null,
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-gray-400">
        <a href="/" className="hover:text-pink-600 transition-colors">Início</a>
        <span>/</span>
        <a href="/loja" className="hover:text-pink-600 transition-colors">Loja</a>
        <span>/</span>
        <span className="text-gray-700 font-medium truncate max-w-xs">{product.name}</span>
      </nav>

      {/* Main product layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-16">
        {/* Gallery */}
        <div>
          <ProductGallery
            images={images.map((img) => ({ url: img.url, alt: img.alt }))}
          />
        </div>

        {/* Info & actions */}
        <div>
          {product.sku && (
            <p className="text-xs text-gray-400 mb-2 font-mono">SKU: {product.sku}</p>
          )}
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight mb-4">
            {product.name}
          </h1>

          {product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {product.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <ProductActions product={productForActions} variants={variants} />
        </div>
      </div>

      {/* Description */}
      {product.description && (
        <div className="mb-16 max-w-2xl">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Descrição</h2>
          <div className="prose prose-sm text-gray-600 leading-relaxed whitespace-pre-line">
            {product.description}
          </div>
        </div>
      )}

      {/* Shipping info strip */}
      <div className="bg-gray-50 rounded-2xl p-6 mb-16 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: '🚚', title: 'Frete Grátis', desc: 'Acima de R$ 299' },
          { icon: '↩️', title: 'Troca Fácil', desc: 'Em até 7 dias corridos' },
          { icon: '🔒', title: 'Pagamento Seguro', desc: 'Protegido e criptografado' },
        ].map((item) => (
          <div key={item.title} className="flex items-start gap-3">
            <span className="text-2xl">{item.icon}</span>
            <div>
              <p className="text-sm font-semibold text-gray-900">{item.title}</p>
              <p className="text-xs text-gray-500">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Related products */}
      {relatedProducts.length > 0 && (
        <div>
          <h2 className="text-xl font-black text-gray-900 mb-6">Você também pode gostar</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
