'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import Link from 'next/link'
import { useCartStore } from '@/store/cart'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import type { User } from '@supabase/supabase-js'
import { Database } from '@/lib/supabase/types'

type Address = Database['public']['Tables']['addresses']['Row']

// --- Zod schemas ---
const identSchema = z.object({
  email: z.string().min(1, 'E-mail obrigatório').email('E-mail inválido'),
  name: z.string().min(2, 'Nome obrigatório'),
})

const addressSchema = z.object({
  cep: z.string().regex(/^\d{5}-?\d{3}$/, 'CEP inválido'),
  street: z.string().min(3, 'Rua obrigatória'),
  number: z.string().min(1, 'Número obrigatório'),
  complement: z.string().optional(),
  neighborhood: z.string().min(2, 'Bairro obrigatório'),
  city: z.string().min(2, 'Cidade obrigatória'),
  state: z.string().length(2, 'Estado inválido (2 letras)'),
})

type IdentForm = z.infer<typeof identSchema>
type AddressForm = z.infer<typeof addressSchema>

interface ShippingOption {
  name: string
  price: number
  days: number
}

const STEPS = ['Identificação', 'Endereço', 'Entrega', 'Pagamento']

export default function CheckoutPage() {
  const items = useCartStore((s) => s.items)
  const subtotal = useCartStore((s) => s.subtotal)
  const total = useCartStore((s) => s.total)
  const couponCode = useCartStore((s) => s.couponCode)
  const couponDiscount = useCartStore((s) => s.couponDiscount)
  const clearCart = useCartStore((s) => s.clearCart)

  const [step, setStep] = useState(1)
  const [user, setUser] = useState<User | null>(null)
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([])
  const [selectedSavedAddress, setSelectedSavedAddress] = useState<string | null>(null)

  const [identData, setIdentData] = useState<IdentForm | null>(null)
  const [addressData, setAddressData] = useState<AddressForm | null>(null)
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([])
  const [selectedShipping, setSelectedShipping] = useState<ShippingOption | null>(null)

  const [cepLoading, setCepLoading] = useState(false)
  const [shippingLoading, setShippingLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const identForm = useForm<IdentForm>()
  const addressForm = useForm<AddressForm>()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user)
      if (data.user) {
        const { data: addrs } = await supabase
          .from('addresses')
          .select('*')
          .eq('user_id', data.user.id)
          .order('is_default', { ascending: false })
        setSavedAddresses(addrs ?? [])
      }
    })
  }, [])

  // Auto-fill ident if logged in
  useEffect(() => {
    if (user) {
      identForm.setValue('email', user.email ?? '')
      identForm.setValue('name', user.user_metadata?.full_name ?? '')
    }
  }, [user, identForm])

  const handleGoogleLogin = async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/checkout` },
    })
  }

  const handleLookupCep = async () => {
    const cep = addressForm.getValues('cep').replace(/\D/g, '')
    if (cep.length !== 8) return
    setCepLoading(true)
    try {
      const res = await fetch(`/api/cep?cep=${cep}`)
      if (res.ok) {
        const data = await res.json()
        if (data.street) addressForm.setValue('street', data.street)
        if (data.neighborhood) addressForm.setValue('neighborhood', data.neighborhood)
        if (data.city) addressForm.setValue('city', data.city)
        if (data.state) addressForm.setValue('state', data.state)
      }
    } catch {
      // silent
    } finally {
      setCepLoading(false)
    }
  }

  const handleFillFromSaved = (addr: Address) => {
    setSelectedSavedAddress(addr.id)
    addressForm.setValue('cep', addr.cep)
    addressForm.setValue('street', addr.street)
    addressForm.setValue('number', addr.number)
    addressForm.setValue('complement', addr.complement ?? '')
    addressForm.setValue('neighborhood', addr.neighborhood)
    addressForm.setValue('city', addr.city)
    addressForm.setValue('state', addr.state)
  }

  const onIdentSubmit = (data: IdentForm) => {
    setIdentData(data)
    setStep(2)
  }

  const onAddressSubmit = async (data: AddressForm) => {
    setAddressData(data)
    setShippingLoading(true)
    try {
      const cep = data.cep.replace(/\D/g, '')
      const res = await fetch(`/api/frete?cep=${cep}`)
      const json = await res.json()
      setShippingOptions(json.options ?? [])
      if (json.options?.length) setSelectedShipping(json.options[0])
    } catch {
      setShippingOptions([])
    } finally {
      setShippingLoading(false)
    }
    setStep(3)
  }

  const onShippingContinue = () => {
    if (!selectedShipping) return
    setStep(4)
  }

  const onSubmitOrder = async () => {
    if (!identData || !addressData || !selectedShipping) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const shippingAddress = {
        recipient: identData.name,
        cep: addressData.cep,
        street: addressData.street,
        number: addressData.number,
        complement: addressData.complement ?? '',
        neighborhood: addressData.neighborhood,
        city: addressData.city,
        state: addressData.state,
      }

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: identData.email,
          name: identData.name,
          items: items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            name: i.name,
            variantDescription: i.variantDescription,
            quantity: i.quantity,
            unitPrice: i.price,
          })),
          shippingAddress,
          shippingMethod: selectedShipping.name,
          shippingCost: selectedShipping.price,
          couponCode: couponCode ?? null,
          subtotal,
          discount: couponDiscount,
          total: total + selectedShipping.price,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao processar pedido')

      clearCart()

      if (data.initPoint) {
        window.location.href = data.initPoint
      } else if (data.orderNumber) {
        window.location.href = `/checkout/sucesso?order_number=${data.orderNumber}`
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Erro ao finalizar pedido. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const shippingCost = selectedShipping?.price ?? 0
  const grandTotal = total + shippingCost

  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-600 mb-4">Seu carrinho está vazio.</p>
        <Link href="/loja" className="text-pink-600 font-semibold hover:underline">Ver loja</Link>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-black text-gray-900 mb-8">Finalizar Compra</h1>

      {/* Steps indicator */}
      <div className="flex items-center gap-0 mb-10 max-w-2xl">
        {STEPS.map((label, idx) => {
          const n = idx + 1
          const active = n === step
          const done = n < step
          return (
            <div key={n} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${done ? 'bg-pink-500 text-white' : active ? 'bg-pink-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {done ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : n}
                </div>
                <span className={`text-xs mt-1 font-medium hidden sm:block ${active ? 'text-pink-600' : 'text-gray-400'}`}>{label}</span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 ${done ? 'bg-pink-500' : 'bg-gray-200'}`} />
              )}
            </div>
          )
        })}
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Steps content */}
        <div className="flex-1">
          {/* Step 1: Identificação */}
          {step === 1 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-6">Identificação</h2>

              {!user && (
                <div className="mb-6">
                  <button
                    onClick={handleGoogleLogin}
                    className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-2xl py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors mb-4"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Entrar com Google
                  </button>
                  <div className="relative text-center text-xs text-gray-400 mb-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200" />
                    </div>
                    <span className="relative bg-white px-3">ou continue como convidado</span>
                  </div>
                </div>
              )}

              <form onSubmit={identForm.handleSubmit(onIdentSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome completo</label>
                  <input
                    {...identForm.register('name', { required: 'Nome obrigatório', minLength: { value: 2, message: 'Nome muito curto' } })}
                    type="text"
                    placeholder="Seu nome completo"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                  {identForm.formState.errors.name && (
                    <p className="mt-1 text-xs text-red-500">{identForm.formState.errors.name.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
                  <input
                    {...identForm.register('email', { required: 'E-mail obrigatório', pattern: { value: /^\S+@\S+\.\S+$/, message: 'E-mail inválido' } })}
                    type="email"
                    placeholder="seu@email.com"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                  {identForm.formState.errors.email && (
                    <p className="mt-1 text-xs text-red-500">{identForm.formState.errors.email.message}</p>
                  )}
                </div>
                <button
                  type="submit"
                  className="w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-4 rounded-2xl transition-colors"
                >
                  Continuar
                </button>
              </form>
            </div>
          )}

          {/* Step 2: Endereço */}
          {step === 2 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-900">Endereço de Entrega</h2>
                <button onClick={() => setStep(1)} className="text-sm text-gray-500 hover:text-pink-600 transition-colors">Voltar</button>
              </div>

              {/* Saved addresses */}
              {savedAddresses.length > 0 && (
                <div className="mb-6">
                  <p className="text-sm font-medium text-gray-700 mb-3">Seus endereços salvos:</p>
                  <div className="space-y-2">
                    {savedAddresses.map((addr) => (
                      <button
                        key={addr.id}
                        onClick={() => handleFillFromSaved(addr)}
                        className={`w-full text-left border rounded-xl p-3 text-sm transition-colors ${
                          selectedSavedAddress === addr.id
                            ? 'border-pink-500 bg-pink-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className="font-semibold text-gray-900">{addr.name}</p>
                        <p className="text-gray-600">{addr.street}, {addr.number}{addr.complement ? `, ${addr.complement}` : ''}</p>
                        <p className="text-gray-500">{addr.neighborhood}, {addr.city} - {addr.state}, {addr.cep}</p>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-3 mb-4">Ou preencha um novo endereço abaixo:</p>
                </div>
              )}

              <form onSubmit={addressForm.handleSubmit(onAddressSubmit)} className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">CEP</label>
                    <div className="flex gap-2">
                      <input
                        {...addressForm.register('cep', { required: 'CEP obrigatório' })}
                        type="text"
                        placeholder="00000-000"
                        maxLength={9}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2').slice(0, 9)
                          addressForm.setValue('cep', v)
                        }}
                        className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                      />
                      <button
                        type="button"
                        onClick={handleLookupCep}
                        disabled={cepLoading}
                        className="px-4 py-3 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                      >
                        {cepLoading ? '...' : 'Buscar'}
                      </button>
                    </div>
                    {addressForm.formState.errors.cep && (
                      <p className="mt-1 text-xs text-red-500">{addressForm.formState.errors.cep.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Rua / Logradouro</label>
                  <input
                    {...addressForm.register('street', { required: 'Rua obrigatória' })}
                    type="text"
                    placeholder="Av. Brasil"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                  {addressForm.formState.errors.street && (
                    <p className="mt-1 text-xs text-red-500">{addressForm.formState.errors.street.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Número</label>
                    <input
                      {...addressForm.register('number', { required: 'Número obrigatório' })}
                      type="text"
                      placeholder="123"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                    {addressForm.formState.errors.number && (
                      <p className="mt-1 text-xs text-red-500">{addressForm.formState.errors.number.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Complemento</label>
                    <input
                      {...addressForm.register('complement')}
                      type="text"
                      placeholder="Apto 42 (opcional)"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Bairro</label>
                  <input
                    {...addressForm.register('neighborhood', { required: 'Bairro obrigatório' })}
                    type="text"
                    placeholder="Centro"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                  {addressForm.formState.errors.neighborhood && (
                    <p className="mt-1 text-xs text-red-500">{addressForm.formState.errors.neighborhood.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Cidade</label>
                    <input
                      {...addressForm.register('city', { required: 'Cidade obrigatória' })}
                      type="text"
                      placeholder="Maringá"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                    {addressForm.formState.errors.city && (
                      <p className="mt-1 text-xs text-red-500">{addressForm.formState.errors.city.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Estado</label>
                    <select
                      {...addressForm.register('state', { required: 'Estado obrigatório' })}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                    >
                      <option value="">UF</option>
                      {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map((uf) => (
                        <option key={uf} value={uf}>{uf}</option>
                      ))}
                    </select>
                    {addressForm.formState.errors.state && (
                      <p className="mt-1 text-xs text-red-500">{addressForm.formState.errors.state.message}</p>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={shippingLoading}
                  className="w-full bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition-colors"
                >
                  {shippingLoading ? 'Buscando opções de frete...' : 'Continuar'}
                </button>
              </form>
            </div>
          )}

          {/* Step 3: Entrega */}
          {step === 3 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-900">Opções de Entrega</h2>
                <button onClick={() => setStep(2)} className="text-sm text-gray-500 hover:text-pink-600 transition-colors">Voltar</button>
              </div>

              {shippingOptions.length === 0 ? (
                <p className="text-gray-500 text-sm">Nenhuma opção de frete disponível.</p>
              ) : (
                <div className="space-y-3">
                  {shippingOptions.map((opt, i) => (
                    <label
                      key={i}
                      className={`flex items-center gap-4 border rounded-2xl p-4 cursor-pointer transition-colors ${
                        selectedShipping?.name === opt.name
                          ? 'border-pink-500 bg-pink-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="shipping"
                        checked={selectedShipping?.name === opt.name}
                        onChange={() => setSelectedShipping(opt)}
                        className="accent-pink-500"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">{opt.name}</p>
                        <p className="text-xs text-gray-500">Entrega em {opt.days} dia{opt.days !== 1 ? 's' : ''} útil{opt.days !== 1 ? 'is' : ''}</p>
                      </div>
                      <span className="text-sm font-bold text-gray-900">
                        {opt.price === 0 ? <span className="text-green-600">Grátis</span> : formatCurrency(opt.price)}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              <button
                onClick={onShippingContinue}
                disabled={!selectedShipping}
                className="mt-6 w-full bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition-colors"
              >
                Continuar
              </button>
            </div>
          )}

          {/* Step 4: Pagamento */}
          {step === 4 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-900">Pagamento</h2>
                <button onClick={() => setStep(3)} className="text-sm text-gray-500 hover:text-pink-600 transition-colors">Voltar</button>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-2xl p-4 mb-6 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Entrega para:</span>
                  <span className="font-medium text-gray-900">{identData?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Endereço:</span>
                  <span className="font-medium text-gray-900 text-right max-w-xs">
                    {addressData?.street}, {addressData?.number} — {addressData?.city}/{addressData?.state}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Frete:</span>
                  <span className="font-medium text-gray-900">{selectedShipping?.name} — {selectedShipping?.price === 0 ? 'Grátis' : formatCurrency(selectedShipping?.price ?? 0)}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
                <svg className="w-8 h-8 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="12" fill="#009ee3"/>
                  <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">MP</text>
                </svg>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Pagamento via Mercado Pago</p>
                  <p className="text-xs text-gray-600">Cartão, Pix, boleto e mais — você escolhe após o clique.</p>
                </div>
              </div>

              {submitError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                  <p className="text-sm text-red-600">{submitError}</p>
                </div>
              )}

              <button
                onClick={onSubmitOrder}
                disabled={submitting}
                className="w-full bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Processando...
                  </>
                ) : (
                  <>Finalizar e Pagar — {formatCurrency(grandTotal)}</>
                )}
              </button>
              <p className="text-center text-xs text-gray-400 mt-3">
                Ao clicar, você será redirecionado para o Mercado Pago com segurança.
              </p>
            </div>
          )}
        </div>

        {/* Order sidebar */}
        <div className="lg:w-80 flex-shrink-0">
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 sticky top-24">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Seu Pedido</h3>
            <div className="space-y-3 mb-4">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3 text-sm">
                  <div className="w-12 h-14 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden relative">
                    {item.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 line-clamp-1">{item.name}</p>
                    {item.variantDescription && (
                      <p className="text-xs text-gray-500">{item.variantDescription}</p>
                    )}
                    <p className="text-xs text-gray-500">Qtd: {item.quantity}</p>
                  </div>
                  <p className="font-semibold text-gray-900 flex-shrink-0">{formatCurrency(item.price * item.quantity)}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 pt-3 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {couponDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Desconto</span>
                  <span>-{formatCurrency(couponDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Frete</span>
                <span>{selectedShipping ? (selectedShipping.price === 0 ? 'Grátis' : formatCurrency(selectedShipping.price)) : '—'}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-100">
                <span>Total</span>
                <span className="text-pink-600 text-base">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
