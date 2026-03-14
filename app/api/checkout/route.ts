import { NextRequest, NextResponse } from 'next/server'
import { getPreference } from '@/lib/mercadopago'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { generateOrderNumber } from '@/lib/utils'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      email,
      name,
      items,
      shippingAddress,
      shippingMethod,
      shippingCost,
      couponCode,
      subtotal,
      discount,
      total,
    } = body

    if (!email || !name || !items?.length || !shippingAddress) {
      return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 })
    }

    // Get logged-in user if any
    let userId: string | null = null
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      userId = user?.id ?? null
    } catch {
      // guest checkout — ignore
    }

    // Validate coupon and get coupon id if provided
    let couponId: string | null = null
    if (couponCode) {
      const { data: coupon } = await supabaseAdmin
        .from('coupons')
        .select('id')
        .eq('code', couponCode.toUpperCase())
        .eq('active', true)
        .single()
      couponId = coupon?.id ?? null
    }

    const orderNumber = generateOrderNumber()

    // Create order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        order_number: orderNumber,
        user_id: userId,
        guest_email: email,
        guest_name: name,
        status: 'pending',
        subtotal,
        discount: discount ?? 0,
        shipping_cost: shippingCost ?? 0,
        total,
        coupon_id: couponId,
        shipping_address: shippingAddress,
        shipping_method: shippingMethod ?? null,
        payment_method: 'mercadopago',
        payment_status: 'pending',
      })
      .select()
      .single()

    if (orderError) throw orderError

    // Create order items
    const { error: itemsError } = await supabaseAdmin.from('order_items').insert(
      items.map((item: any) => ({
        order_id: order.id,
        product_id: item.productId ?? null,
        variant_id: item.variantId ?? null,
        product_name: item.name,
        variant_description: item.variantDescription ?? null,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.unitPrice * item.quantity,
      }))
    )
    if (itemsError) throw itemsError

    // Increment coupon used_count
    if (couponId) {
      const { data: couponRow } = await supabaseAdmin
        .from('coupons')
        .select('used_count')
        .eq('id', couponId)
        .single()
      if (couponRow) {
        try {
          await supabaseAdmin
            .from('coupons')
            .update({ used_count: (couponRow.used_count ?? 0) + 1 })
            .eq('id', couponId)
        } catch { /* Non-fatal */ }
      }
    }

    // Create Mercado Pago preference
    const preference = getPreference()
    const mp = await preference.create({
      body: {
        external_reference: order.id,
        items: items.map((item: any) => ({
          id: item.productId ?? 'product',
          title: item.name + (item.variantDescription ? ` - ${item.variantDescription}` : ''),
          quantity: item.quantity,
          unit_price: item.unitPrice,
          currency_id: 'BRL',
        })),
        payer: {
          name,
          email,
        },
        payment_methods: {
          installments: 12,
        },
        back_urls: {
          success: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/sucesso?order_number=${orderNumber}`,
          failure: `${process.env.NEXT_PUBLIC_APP_URL}/checkout?error=payment_failed`,
          pending: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/sucesso?order_number=${orderNumber}`,
        },
        auto_return: 'approved',
        notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`,
      },
    })

    return NextResponse.json({
      orderId: order.id,
      orderNumber,
      preferenceId: mp.id,
      initPoint: mp.init_point,
    })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'Erro ao processar pedido. Tente novamente.' }, { status: 500 })
  }
}
