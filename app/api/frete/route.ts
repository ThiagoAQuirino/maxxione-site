import { NextRequest, NextResponse } from 'next/server'
import { calcularFrete } from '@/lib/melhorenvio'

// Default dimensions for clothing items
const DEFAULT_ITEM = { width: 15, height: 5, length: 20, weight: 0.3 }

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const cep = searchParams.get('cep')?.replace(/\D/g, '') ?? ''

  if (cep.length !== 8) {
    return NextResponse.json({ error: 'CEP inválido' }, { status: 400 })
  }

  try {
    const produtos = [{ id: '1', ...DEFAULT_ITEM, insurance_value: 50, quantity: 1 }]
    const result = await calcularFrete({ cepDestino: cep, produtos })

    const options = result
      .filter((r: any) => !r.error && r.price)
      .map((r: any) => ({
        name: r.name,
        price: parseFloat(r.price),
        days: r.delivery_time ?? 7,
      }))
      .sort((a: any, b: any) => a.price - b.price)

    return NextResponse.json({ options })
  } catch (error) {
    console.error('Erro frete:', error)
    return NextResponse.json({ options: [] })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { cep, items } = body

    if (!cep) {
      return NextResponse.json({ error: 'CEP é obrigatório' }, { status: 400 })
    }

    const produtos = (items ?? []).map((item: any, i: number) => ({
      id: String(i + 1),
      width: item.width ?? DEFAULT_ITEM.width,
      height: item.height ?? DEFAULT_ITEM.height,
      length: item.length ?? DEFAULT_ITEM.length,
      weight: item.weight ?? DEFAULT_ITEM.weight,
      insurance_value: item.price ?? 50,
      quantity: item.quantity ?? 1,
    }))

    if (!produtos.length) {
      produtos.push({ id: '1', ...DEFAULT_ITEM, insurance_value: 50, quantity: 1 })
    }

    const result = await calcularFrete({ cepDestino: cep.replace(/\D/g, ''), produtos })

    const options = result
      .filter((r: any) => !r.error && r.price)
      .map((r: any) => ({
        name: r.name,
        price: parseFloat(r.price),
        days: r.delivery_time ?? 7,
      }))
      .sort((a: any, b: any) => a.price - b.price)

    return NextResponse.json({ options })
  } catch (error) {
    console.error('Erro frete:', error)
    return NextResponse.json({ options: [] })
  }
}
