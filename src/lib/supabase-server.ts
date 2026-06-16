// ================================================================
// FLUXY — Supabase Client (Server)
// ================================================================

import { createServerClient, type CookieMethodsServer } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseEnv } from './env'

export async function createServerSupabase() {
  const { url, anonKey } = getSupabaseEnv()
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

  return createServerClient(url, anonKey, { cookies: cookieMethods })
}
