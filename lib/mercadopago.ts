import { MercadoPagoConfig, Preference, Payment } from 'mercadopago'

let _client: MercadoPagoConfig | null = null
function getClient() {
  if (!_client) {
    _client = new MercadoPagoConfig({
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
    })
  }
  return _client
}

export function getPreference() {
  return new Preference(getClient())
}

export function getPayment() {
  return new Payment(getClient())
}
