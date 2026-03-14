import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')?.trim().toUpperCase()

  if (!code) {
    return NextResponse.json({ valid: false, message: 'Código não informado.' })
  }

  const { data: coupon, error } = await supabaseAdmin
    .from('coupons')
    .select('id, code, type, value, min_order_value, max_uses, used_count, expires_at, active')
    .eq('code', code)
    .eq('active', true)
    .single()

  if (error || !coupon) {
    return NextResponse.json({ valid: false, message: 'Cupom inválido ou inexistente.' })
  }

  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, message: 'Este cupom está expirado.' })
  }

  if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
    return NextResponse.json({ valid: false, message: 'Este cupom já atingiu o limite de usos.' })
  }

  return NextResponse.json({
    valid: true,
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    min_order_value: coupon.min_order_value ?? 0,
  })
}
