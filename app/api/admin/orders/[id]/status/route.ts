import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const VALID_STATUSES = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Validate admin session
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const { id } = await params

  let body: { status?: string; tracking_code?: string; notes?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corpo da requisição inválido' }, { status: 400 })
  }

  const { status, tracking_code, notes } = body

  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
  }

  // Check order exists
  const { data: order } = await supabaseAdmin.from('orders').select('id').eq('id', id).single()
  if (!order) {
    return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
  }

  // Build update payload
  const updatePayload: Record<string, string> = { status }
  if (tracking_code !== undefined) updatePayload.tracking_code = tracking_code

  const { error: updateErr } = await supabaseAdmin
    .from('orders')
    .update(updatePayload)
    .eq('id', id)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  // Insert status history
  const { error: histErr } = await supabaseAdmin
    .from('order_status_history')
    .insert({ order_id: id, status, notes: notes ?? null })

  if (histErr) {
    console.error('Failed to insert order_status_history:', histErr.message)
  }

  return NextResponse.json({ ok: true })
}
