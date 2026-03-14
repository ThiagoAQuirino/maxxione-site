const MELHOR_ENVIO_URL = 'https://melhorenvio.com.br/api/v2'

interface FreteItem {
  id: string
  width: number
  height: number
  length: number
  weight: number
  insurance_value: number
  quantity: number
}

interface FreteInput {
  cepDestino: string
  produtos: FreteItem[]
}

export async function calcularFrete({ cepDestino, produtos }: FreteInput) {
  const res = await fetch(`${MELHOR_ENVIO_URL}/me/shipment/calculate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.MELHOR_ENVIO_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'MaxxiOne (maxxione.loja@gmail.com)',
    },
    body: JSON.stringify({
      from: { postal_code: process.env.NEXT_PUBLIC_ORIGIN_CEP },
      to: { postal_code: cepDestino.replace(/\D/g, '') },
      products: produtos,
      options: { receipt: false, own_hand: false },
      services: '1,2,17', // PAC, SEDEX, Mini Envios
    }),
  })
  if (!res.ok) throw new Error('Erro ao calcular frete')
  return res.json()
}
