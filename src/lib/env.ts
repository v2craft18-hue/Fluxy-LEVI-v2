// ================================================================
// FLUXY — Validação de Variáveis de Ambiente
// ================================================================

/**
 * Valida e retorna variáveis de ambiente obrigatórias.
 * Lança erro descriptivo se alguma estiver ausente.
 */
export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      'Variáveis de ambiente Supabase não configuradas.\n' +
      'Certifique-se de definir:\n' +
      '- NEXT_PUBLIC_SUPABASE_URL\n' +
      '- NEXT_PUBLIC_SUPABASE_ANON_KEY'
    )
  }

  return { url, anonKey }
}

/**
 * Valida service role key (obrigatório no servidor).
 */
export function getServiceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!key) {
    throw new Error(
      'Variável de ambiente SUPABASE_SERVICE_ROLE_KEY não configurada.\n' +
      'Necessária apenas no servidor para operações administrativas.'
    )
  }

  return key
}
