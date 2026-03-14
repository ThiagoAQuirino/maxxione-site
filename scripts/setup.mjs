#!/usr/bin/env node
/**
 * Setup automático do e-commerce Maxxione
 * Executa: migração SQL + configura Google OAuth no Supabase
 *
 * Uso: node scripts/setup.mjs <SUPABASE_PAT>
 * Onde SUPABASE_PAT = token de https://supabase.com/dashboard/account/tokens
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const PAT = process.argv[2]
const PROJECT_REF = 'tcxhplamxbbvckivhimm'
const API = 'https://api.supabase.com/v1'

const GOOGLE_CLIENT_ID     = process.env.GOOGLE_CLIENT_ID     || ''
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''
const APP_URL              = process.env.NEXT_PUBLIC_APP_URL  || 'https://maxxione.com.br'

if (!PAT) {
  console.error('\n❌  Informe o Personal Access Token do Supabase:')
  console.error('   node scripts/setup.mjs SEU_TOKEN_AQUI\n')
  console.error('   Gere em: https://supabase.com/dashboard/account/tokens\n')
  process.exit(1)
}

async function api(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${PAT}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json
  try { json = JSON.parse(text) } catch { json = { raw: text } }
  if (!res.ok) throw new Error(`${res.status} ${path} → ${JSON.stringify(json)}`)
  return json
}

async function runSQL(query) {
  return api('POST', `/projects/${PROJECT_REF}/database/query`, { query })
}

async function step(label, fn) {
  process.stdout.write(`  ${label}... `)
  try {
    const result = await fn()
    console.log('✅')
    return result
  } catch (err) {
    console.log('❌')
    console.error(`     Erro: ${err.message}`)
    return null
  }
}

async function main() {
  console.log('\n🚀  Setup Maxxione E-commerce\n')

  // ── 1. Verificar conexão ──────────────────────────────────────────────────
  console.log('1️⃣   Verificando conexão com Supabase...')
  const project = await step('Conectando ao projeto', () =>
    api('GET', `/projects/${PROJECT_REF}`)
  )
  if (!project) {
    console.error('\n❌  Não foi possível conectar. Verifique o token.\n')
    process.exit(1)
  }
  console.log(`     Projeto: ${project.name} (${project.region})\n`)

  // ── 2. Executar migration SQL ─────────────────────────────────────────────
  console.log('2️⃣   Criando schema do banco de dados...')

  const sqlFile = readFileSync(join(ROOT, 'migrations/001_initial_schema.sql'), 'utf-8')

  // Separa em blocos por ; preservando functions/triggers
  const statements = sqlFile
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 10 && !s.startsWith('--'))

  let ok = 0, fail = 0
  for (const stmt of statements) {
    const label = stmt.substring(0, 60).replace(/\n/g, ' ') + '...'
    const res = await step(label, () => runSQL(stmt + ';'))
    if (res !== null) ok++; else fail++
  }

  console.log(`\n     ✅ ${ok} statements executados${fail > 0 ? ` | ⚠️ ${fail} com aviso` : ''}\n`)

  // ── 3. Configurar Google OAuth ────────────────────────────────────────────
  console.log('3️⃣   Configurando Google OAuth...')

  await step('Ativando provider Google', () =>
    api('PATCH', `/projects/${PROJECT_REF}/config/auth`, {
      external_google_enabled: true,
      external_google_client_id: GOOGLE_CLIENT_ID,
      external_google_secret: GOOGLE_CLIENT_SECRET,
      external_google_skip_nonce_check: false,
      site_url: APP_URL,
      additional_redirect_urls: [
        APP_URL,
        'http://localhost:3000',
        `${APP_URL}/auth/callback`,
        'http://localhost:3000/auth/callback',
      ],
    })
  )

  const CALLBACK_URL = `https://${PROJECT_REF}.supabase.co/auth/v1/callback`

  console.log('\n     Google OAuth configurado!')
  console.log(`     Callback URL: ${CALLBACK_URL}\n`)

  // ── 4. Criar bucket de imagens ────────────────────────────────────────────
  console.log('4️⃣   Verificando Storage bucket...')
  await step('Bucket "products"', () =>
    api('POST', `/projects/${PROJECT_REF}/storage/buckets`, {
      id: 'products',
      name: 'products',
      public: true,
    }).catch(err => {
      if (err.message.includes('already exists') || err.message.includes('409')) return { ok: true }
      throw err
    })
  )

  // ── 5. Resultado final ────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(60))
  console.log('✅  Setup concluído!\n')
  console.log('📌  AÇÃO MANUAL NECESSÁRIA (1 minuto):')
  console.log('   Google Cloud Console → seu OAuth Client → adicione:')
  console.log(`   URI de redirecionamento: ${CALLBACK_URL}`)
  console.log(`   Acesse: https://console.cloud.google.com/apis/credentials\n`)
  console.log('─'.repeat(60))
  console.log('\n🏁  Próximo passo: npm run dev\n')
}

main().catch(err => {
  console.error('\n💥  Erro fatal:', err.message)
  process.exit(1)
})
