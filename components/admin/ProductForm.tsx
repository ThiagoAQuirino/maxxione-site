'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

interface Category {
  id: string
  name: string
}

interface ProductImage {
  id?: string
  url: string
  alt?: string | null
  sort_order: number
  isNew?: boolean
  file?: File
}

interface ProductVariant {
  id?: string
  size: string
  color: string
  color_hex: string
  sku: string
  price_override: string
  stock: number
  active: boolean
}

interface ProductFormData {
  id?: string
  name: string
  slug: string
  description: string
  category_id: string
  base_price: string
  compare_price: string
  cost_price: string
  sku: string
  tags: string
  active: boolean
  featured: boolean
  images: ProductImage[]
  variants: ProductVariant[]
}

interface Props {
  categories: Category[]
  initialData?: Partial<ProductFormData>
  productId?: string
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

const TABS = ['Informações', 'Imagens', 'Variantes'] as const
type Tab = (typeof TABS)[number]

export default function ProductForm({ categories, initialData, productId }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('Informações')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<ProductFormData>({
    name: initialData?.name ?? '',
    slug: initialData?.slug ?? '',
    description: initialData?.description ?? '',
    category_id: initialData?.category_id ?? '',
    base_price: String(initialData?.base_price ?? ''),
    compare_price: String(initialData?.compare_price ?? ''),
    cost_price: String(initialData?.cost_price ?? ''),
    sku: initialData?.sku ?? '',
    tags: initialData?.tags ?? '',
    active: initialData?.active ?? true,
    featured: initialData?.featured ?? false,
    images: initialData?.images ?? [],
    variants: initialData?.variants ?? [],
  })

  function setField<K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleNameChange(name: string) {
    setForm((prev) => ({
      ...prev,
      name,
      slug: prev.slug === slugify(prev.name) || prev.slug === '' ? slugify(name) : prev.slug,
    }))
  }

  // Images
  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files) return
    const newImages: ProductImage[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!file.type.startsWith('image/')) continue
      const url = URL.createObjectURL(file)
      newImages.push({
        url,
        alt: file.name,
        sort_order: form.images.length + i,
        isNew: true,
        file,
      })
    }
    setForm((prev) => ({ ...prev, images: [...prev.images, ...newImages] }))
  }, [form.images.length])

  function removeImage(index: number) {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index).map((img, i) => ({ ...img, sort_order: i })),
    }))
  }

  function moveImage(index: number, direction: 'up' | 'down') {
    const newImages = [...form.images]
    const swap = direction === 'up' ? index - 1 : index + 1
    if (swap < 0 || swap >= newImages.length) return
    ;[newImages[index], newImages[swap]] = [newImages[swap], newImages[index]]
    newImages.forEach((img, i) => (img.sort_order = i))
    setField('images', newImages)
  }

  // Variants
  function addVariant() {
    setField('variants', [
      ...form.variants,
      { size: '', color: '', color_hex: '#000000', sku: '', price_override: '', stock: 0, active: true },
    ])
  }

  function updateVariant(index: number, key: keyof ProductVariant, value: string | number | boolean) {
    setField('variants', form.variants.map((v, i) => i === index ? { ...v, [key]: value } : v))
  }

  function removeVariant(index: number) {
    setField('variants', form.variants.filter((_, i) => i !== index))
  }

  // Save
  async function handleSave() {
    setError(null)
    setSaving(true)
    const supabase = createClient()
    try {
      const productPayload = {
        name: form.name,
        slug: form.slug,
        description: form.description || null,
        category_id: form.category_id || null,
        base_price: parseFloat(form.base_price) || 0,
        compare_price: form.compare_price ? parseFloat(form.compare_price) : null,
        cost_price: form.cost_price ? parseFloat(form.cost_price) : null,
        sku: form.sku || null,
        tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : null,
        active: form.active,
        featured: form.featured,
      }

      let pid = productId
      if (pid) {
        const { error: err } = await supabase.from('products').update(productPayload).eq('id', pid)
        if (err) throw new Error(err.message)
      } else {
        const { data, error: err } = await supabase.from('products').insert(productPayload).select('id').single()
        if (err) throw new Error(err.message)
        pid = data.id
      }

      // Upload new images
      const uploadedImages: ProductImage[] = []
      for (const img of form.images) {
        if (img.isNew && img.file) {
          const ext = img.file.name.split('.').pop()
          const path = `${pid}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
          const { error: upErr } = await supabase.storage.from('products').upload(path, img.file)
          if (upErr) throw new Error(upErr.message)
          const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(path)
          uploadedImages.push({ url: publicUrl, alt: img.alt, sort_order: img.sort_order })
        } else if (!img.isNew) {
          uploadedImages.push(img)
        }
      }

      // Delete old images and reinsert
      await supabase.from('product_images').delete().eq('product_id', pid!)
      if (uploadedImages.length > 0) {
        const { error: imgErr } = await supabase.from('product_images').insert(
          uploadedImages.map((img) => ({
            product_id: pid!,
            url: img.url,
            alt: img.alt ?? null,
            sort_order: img.sort_order,
          }))
        )
        if (imgErr) throw new Error(imgErr.message)
      }

      // Upsert variants
      if (pid) {
        // Delete variants that no longer exist
        const existingIds = form.variants.filter((v) => v.id).map((v) => v.id!)
        if (existingIds.length > 0) {
          await supabase.from('product_variants').delete().eq('product_id', pid).not('id', 'in', `(${existingIds.join(',')})`)
        } else {
          await supabase.from('product_variants').delete().eq('product_id', pid)
        }

        for (const variant of form.variants) {
          const varPayload = {
            product_id: pid,
            size: variant.size || null,
            color: variant.color || null,
            color_hex: variant.color_hex || null,
            sku: variant.sku || null,
            price_override: variant.price_override ? parseFloat(variant.price_override) : null,
            stock: variant.stock,
            active: variant.active,
          }
          if (variant.id) {
            await supabase.from('product_variants').update(varPayload).eq('id', variant.id)
          } else {
            await supabase.from('product_variants').insert(varPayload)
          }
        }
      }

      router.push('/admin/produtos')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar produto')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-pink-500 text-pink-600 bg-pink-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Tab: Informações */}
          {activeTab === 'Informações' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome do produto *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder="Ex: Legging Fitness Premium"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL)</label>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => setField('slug', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder="legging-fitness-premium"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                  <select
                    value={form.category_id}
                    onChange={(e) => setField('category_id', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                  >
                    <option value="">Sem categoria</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setField('description', e.target.value)}
                    rows={4}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                    placeholder="Descreva o produto..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preço base (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.base_price}
                    onChange={(e) => setField('base_price', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder="0,00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preço comparativo (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.compare_price}
                    onChange={(e) => setField('compare_price', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder="0,00 (preço original p/ mostrar desconto)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preço de custo (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.cost_price}
                    onChange={(e) => setField('cost_price', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder="0,00 (interno)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                  <input
                    type="text"
                    value={form.sku}
                    onChange={(e) => setField('sku', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder="MAX-001"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags (separadas por vírgula)</label>
                  <input
                    type="text"
                    value={form.tags}
                    onChange={(e) => setField('tags', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder="fitness, legging, academia"
                  />
                </div>

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div
                      onClick={() => setField('active', !form.active)}
                      className={`relative w-10 h-6 rounded-full transition-colors ${form.active ? 'bg-pink-500' : 'bg-gray-300'}`}
                    >
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.active ? 'left-5' : 'left-1'}`} />
                    </div>
                    <span className="text-sm text-gray-700">Produto ativo</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <div
                      onClick={() => setField('featured', !form.featured)}
                      className={`relative w-10 h-6 rounded-full transition-colors ${form.featured ? 'bg-yellow-400' : 'bg-gray-300'}`}
                    >
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.featured ? 'left-5' : 'left-1'}`} />
                    </div>
                    <span className="text-sm text-gray-700">Em destaque</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Imagens */}
          {activeTab === 'Imagens' && (
            <div className="space-y-5">
              <div
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-pink-400 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  handleFileSelect(e.dataTransfer.files)
                }}
              >
                <div className="text-4xl mb-2">📷</div>
                <p className="text-sm font-medium text-gray-700">Arraste imagens aqui ou clique para selecionar</p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP — máximo 5MB por imagem</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files)}
                />
              </div>

              {form.images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {form.images.map((img, i) => (
                    <div key={i} className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                      <div className="aspect-square relative">
                        <Image src={img.url} alt={img.alt ?? ''} fill className="object-cover" sizes="150px" />
                      </div>
                      {i === 0 && (
                        <span className="absolute top-1 left-1 bg-pink-500 text-white text-xs px-1.5 py-0.5 rounded font-medium">Principal</span>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                        <button onClick={() => moveImage(i, 'up')} className="bg-white rounded p-1 text-xs hover:bg-gray-100" title="Mover para esquerda">←</button>
                        <button onClick={() => removeImage(i)} className="bg-red-500 text-white rounded p-1 text-xs hover:bg-red-600" title="Remover">✕</button>
                        <button onClick={() => moveImage(i, 'down')} className="bg-white rounded p-1 text-xs hover:bg-gray-100" title="Mover para direita">→</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: Variantes */}
          {activeTab === 'Variantes' && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 uppercase bg-gray-50">
                      <th className="px-3 py-2">Tamanho</th>
                      <th className="px-3 py-2">Cor</th>
                      <th className="px-3 py-2">Hex</th>
                      <th className="px-3 py-2">SKU</th>
                      <th className="px-3 py-2">Preço (R$)</th>
                      <th className="px-3 py-2">Estoque</th>
                      <th className="px-3 py-2">Ativo</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {form.variants.map((v, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={v.size}
                            onChange={(e) => updateVariant(i, 'size', e.target.value)}
                            className="w-20 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-pink-500"
                            placeholder="P, M, G..."
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={v.color}
                            onChange={(e) => updateVariant(i, 'color', e.target.value)}
                            className="w-24 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-pink-500"
                            placeholder="Preto"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            <input
                              type="color"
                              value={v.color_hex || '#000000'}
                              onChange={(e) => updateVariant(i, 'color_hex', e.target.value)}
                              className="w-8 h-7 rounded border border-gray-300 cursor-pointer p-0"
                            />
                            <input
                              type="text"
                              value={v.color_hex}
                              onChange={(e) => updateVariant(i, 'color_hex', e.target.value)}
                              className="w-20 border border-gray-300 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-pink-500"
                              placeholder="#000000"
                            />
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={v.sku}
                            onChange={(e) => updateVariant(i, 'sku', e.target.value)}
                            className="w-24 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-pink-500"
                            placeholder="MAX-001-P"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={v.price_override}
                            onChange={(e) => updateVariant(i, 'price_override', e.target.value)}
                            className="w-24 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-pink-500"
                            placeholder="(padrão)"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            value={v.stock}
                            onChange={(e) => updateVariant(i, 'stock', parseInt(e.target.value) || 0)}
                            className="w-16 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-pink-500"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={v.active}
                            onChange={(e) => updateVariant(i, 'active', e.target.checked)}
                            className="accent-pink-500 w-4 h-4"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => removeVariant(i)}
                            className="text-red-400 hover:text-red-600 text-xs font-medium"
                          >
                            Remover
                          </button>
                        </td>
                      </tr>
                    ))}
                    {form.variants.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-3 py-6 text-center text-gray-400 text-sm">
                          Nenhuma variante adicionada. Clique em "Adicionar variante" para começar.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <button
                onClick={addVariant}
                className="text-sm text-pink-600 hover:text-pink-800 font-medium border border-pink-300 hover:border-pink-500 px-4 py-2 rounded-lg transition-colors"
              >
                + Adicionar variante
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/admin/produtos')}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !form.name || !form.base_price}
          className="bg-pink-500 hover:bg-pink-600 disabled:bg-gray-300 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {saving ? 'Salvando...' : productId ? 'Salvar alterações' : 'Criar produto'}
        </button>
      </div>
    </div>
  )
}
