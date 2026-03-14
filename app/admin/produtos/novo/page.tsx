import { supabaseAdmin } from '@/lib/supabase/admin'
import ProductForm from '@/components/admin/ProductForm'

export default async function NovoProdutoPage() {
  const { data: categories } = await supabaseAdmin
    .from('categories')
    .select('id, name')
    .eq('active', true)
    .order('name')

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Novo Produto</h1>
        <p className="text-sm text-gray-500 mt-1">Preencha as informações do produto</p>
      </div>
      <ProductForm categories={categories ?? []} />
    </div>
  )
}
