// ================================================================
// FLUXY — Supabase Client (Browser)
// ================================================================

import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseEnv } from './env'

// ── Cliente browser (componentes client-side) ──
export function createClient() {
  const { url, anonKey } = getSupabaseEnv()
  return createBrowserClient(url, anonKey)
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
