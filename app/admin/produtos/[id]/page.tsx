import { supabaseAdmin } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import ProductForm from '@/components/admin/ProductForm'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditarProdutoPage({ params }: Props) {
  const { id } = await params

  const [{ data: product }, { data: categories }] = await Promise.all([
    supabaseAdmin
      .from('products')
      .select(`
        *,
        product_images ( id, url, alt, sort_order ),
        product_variants ( id, size, color, color_hex, sku, price_override, stock, active )
      `)
      .eq('id', id)
      .single(),
    supabaseAdmin
      .from('categories')
      .select('id, name')
      .eq('active', true)
      .order('name'),
  ])

  if (!product) notFound()

  const images = ((product.product_images as {
    id: string; url: string; alt: string | null; sort_order: number
  }[]) ?? []).sort((a, b) => a.sort_order - b.sort_order)

  const variants = ((product.product_variants as {
    id: string; size: string | null; color: string | null; color_hex: string | null
    sku: string | null; price_override: number | null; stock: number; active: boolean
  }[]) ?? []).map((v) => ({
    id: v.id,
    size: v.size ?? '',
    color: v.color ?? '',
    color_hex: v.color_hex ?? '#000000',
    sku: v.sku ?? '',
    price_override: v.price_override != null ? String(v.price_override) : '',
    stock: v.stock,
    active: v.active,
  }))

  const initialData = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description ?? '',
    category_id: product.category_id ?? '',
    base_price: String(product.base_price),
    compare_price: product.compare_price != null ? String(product.compare_price) : '',
    cost_price: product.cost_price != null ? String(product.cost_price) : '',
    sku: product.sku ?? '',
    tags: (product.tags ?? []).join(', '),
    active: product.active,
    featured: product.featured,
    images,
    variants,
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Editar Produto</h1>
        <p className="text-sm text-gray-500 mt-1">{product.name}</p>
      </div>
      <ProductForm categories={categories ?? []} initialData={initialData} productId={id} />
    </div>
  )
}
