// ================================================================
// FLUXY — Supabase Client (Browser)
// ================================================================

import { createBrowserClient } from '@supabase/ssr'

function getEnvVars() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    // Durante o build estático do Next.js as vars NEXT_PUBLIC_* podem não estar
    // disponíveis. Retornamos strings vazias para não crashar o prerender —
    // o cliente resultante falhará graciosamente em runtime quando requisitado.
    if (process.env.NODE_ENV === 'production' || process.env.NEXT_PHASE === 'phase-production-build') {
      return { url: url ?? '', key: key ?? '' }
    }
    throw new Error(
      '[Fluxy] Variáveis de ambiente do Supabase não encontradas. ' +
      'Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    )
  }
  return { url, key }
}

// ── Cliente browser (singleton — preserva cookies de sessão entre chamadas) ──
let browserClient: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (browserClient) return browserClient
  const { url, key } = getEnvVars()
  browserClient = createBrowserClient(url, key)
  return browserClient
}

// ── Helpers de queries reutilizáveis ──
export const queries = {
  // Pedidos com todas as relações
  pedidoCompleto: `
    *,
    cliente:clientes(*),
    vendedor:vendedores(*),
    entregador:entregadores(*),
    itens:pedido_itens(*, produto:produtos(*)),
    pagamentos(*)
  `,
  // Pedido simples para listagem
  pedidoLista: `
    id, numero, status, total, data_pedido, data_ent, hora_ent,
    momento_pag, taxa_entrega, desconto,
    cliente:clientes(id, nome, tel, whats),
    vendedor:vendedores(id, nome),
    entregador:entregadores(id, nome),
    pagamentos(id, status, forma, valor, momento)
  `,
}
