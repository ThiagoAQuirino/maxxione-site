'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  productId: string
  productName: string
}

export default function DeleteProductButton({ productId, productName }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm(`Excluir "${productName}"?\n\nEssa ação não pode ser desfeita.`)) return
    setLoading(true)
    await supabase.from('product_variants').delete().eq('product_id', productId)
    await supabase.from('product_images').delete().eq('product_id', productId)
    await supabase.from('products').delete().eq('id', productId)
    setLoading(false)
    router.refresh()
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
    >
      {loading ? '...' : 'Excluir'}
    </button>
  )
}
