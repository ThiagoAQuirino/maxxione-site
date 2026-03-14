'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  id: string // variant_id or product_id if no variants
  productId: string
  variantId: string | null
  name: string
  variantDescription: string | null
  price: number
  image: string | null
  quantity: number
  slug: string
}

interface CartStore {
  items: CartItem[]
  couponCode: string | null
  couponDiscount: number
  addItem: (item: CartItem) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
  setCoupon: (code: string | null, discount: number) => void
  get subtotal(): number
  get total(): number
  get itemCount(): number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      couponCode: null,
      couponDiscount: 0,

      get subtotal() {
        return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0)
      },
      get total() {
        return Math.max(0, get().subtotal - get().couponDiscount)
      },
      get itemCount() {
        return get().items.reduce((sum, item) => sum + item.quantity, 0)
      },

      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.id === item.id)
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i
              ),
            }
          }
          return { items: [...state.items, item] }
        }),

      removeItem: (id) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

      updateQuantity: (id, quantity) =>
        set((state) => ({
          items: quantity <= 0
            ? state.items.filter((i) => i.id !== id)
            : state.items.map((i) => (i.id === id ? { ...i, quantity } : i)),
        })),

      clearCart: () => set({ items: [], couponCode: null, couponDiscount: 0 }),

      setCoupon: (code, discount) =>
        set({ couponCode: code, couponDiscount: discount }),
    }),
    { name: 'maxxione-cart' }
  )
)
