// ================================================================
// FLUXY — Supabase Client (Server)
// ================================================================

import { createServerClient, type CookieMethodsServer } from '@supabase/ssr'
import { cookies } from 'next/headers'

function getEnvVars() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    // Durante o build estático do Next.js as vars podem não estar disponíveis.
    // Retornamos strings vazias para não crashar o prerender.
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return { url: url ?? '', key: key ?? '' }
    }
    throw new Error(
      '[Fluxy] Variáveis de ambiente do Supabase não encontradas. ' +
      'Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    )
  }
  return { url, key }
}

export async function createServerSupabase() {
  const { url, key } = getEnvVars()
  const cookieStore = await cookies()

  const cookieMethods: CookieMethodsServer = {
    getAll() {
      return cookieStore.getAll()
    },
    setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
      try {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
        )
      } catch {
        // Ignorado em Server Components (somente leitura)
      }
    },
  }

  return createServerClient(url, key, { cookies: cookieMethods })
}
