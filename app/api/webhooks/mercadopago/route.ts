import { NextRequest, NextResponse } from 'next/server'
import { getPayment } from '@/lib/mercadopago'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (body.type !== 'payment') {
      return NextResponse.json({ ok: true })
    }

    const payment = getPayment()
    const paymentData = await payment.get({ id: body.data.id })

    const orderId = paymentData.external_reference
    if (!orderId) return NextResponse.json({ ok: true })

    let orderStatus = 'pending'
    let paymentStatus = paymentData.status || 'pending'

    if (paymentData.status === 'approved') {
      orderStatus = 'paid'
    } else if (paymentData.status === 'rejected' || paymentData.status === 'cancelled') {
      orderStatus = 'cancelled'
    }

    await supabaseAdmin
      .from('orders')
      .update({
        status: orderStatus as any,
        payment_id: String(paymentData.id),
        payment_status: paymentStatus,
        payment_method: paymentData.payment_type_id || 'mercadopago',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    await supabaseAdmin.from('order_status_history').insert({
      order_id: orderId,
      status: orderStatus,
      notes: `Pagamento ${paymentStatus} via Mercado Pago`,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook error' }, { status: 500 })
  }
}
