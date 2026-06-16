// ================================================================
// FLUXY — Middleware Multi-Tenant com Segurança Completa
// ================================================================

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'
import { getSupabaseEnv } from '@/lib/env'

// Rotas públicas — não requerem autenticação
const PUBLIC_ROUTES = ['/login', '/register', '/api/webhook']

export async function middleware(request: NextRequest) {
  try {
    const { url, anonKey } = getSupabaseEnv()
    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(
      url,
      anonKey,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: Partial<ResponseCookie> }>) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const pathname = request.nextUrl.pathname
    const isPublic = PUBLIC_ROUTES.some(r => pathname.startsWith(r))

    const { data: { user } } = await supabase.auth.getUser()

    // Não autenticado tentando acessar rota protegida
    if (!user && !isPublic) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/login'
      redirectUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // Autenticado tentando acessar login → dashboard
    if (user && pathname === '/login') {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/dashboard'
      return NextResponse.redirect(redirectUrl)
    }

    // Autenticado: verificar se tem empresa_id vinculado
    if (user && !isPublic) {
      const { data: usuario } = await supabase
        .from('usuarios')
        .select('empresa_id, ativo, perfil')
        .eq('id', user.id)
        .single()

      // Usuário sem empresa ou inativo → logout
      if (!usuario?.empresa_id || !usuario?.ativo) {
        await supabase.auth.signOut()
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/login'
        redirectUrl.searchParams.set('error', 'sem_empresa')
        return NextResponse.redirect(redirectUrl)
      }

      // Controle de acesso por perfil
      const perfil = usuario.perfil
      const SOMENTE_ADMIN = ['/config', '/logs', '/financeiro', '/caixa', '/despesas', '/comissoes', '/vendedores', '/entregadores', '/usuarios']

      // /perfil é acessível a todos os perfis (não bloquear)
      if (perfil === 'entregador' && !pathname.startsWith('/entregas') && !pathname.startsWith('/perfil') && !pathname.startsWith('/metas')) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/entregas'
        return NextResponse.redirect(redirectUrl)
      }

      if (perfil === 'vendedor' && SOMENTE_ADMIN.some(r => pathname.startsWith(r))) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/pedidos'
        return NextResponse.redirect(redirectUrl)
      }

      if (perfil !== 'admin' && SOMENTE_ADMIN.some(r => pathname.startsWith(r))) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = perfil === 'entregador' ? '/entregas' : '/pedidos'
        return NextResponse.redirect(redirectUrl)
      }
    }

    return supabaseResponse
  } catch (error) {
    console.error('[Middleware Error]', error)
    // Se as variáveis de ambiente não existirem, deixar passar para mostrar erro na página
    return NextResponse.next({ request })
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
