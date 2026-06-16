// ================================================================
// FLUXY — Middleware Multi-Tenant com Segurança Completa
// ================================================================

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'

// Rotas públicas — não requerem autenticação
const PUBLIC_ROUTES = ['/login', '/register', '/api/webhook']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Autenticado tentando acessar login → dashboard
  if (user && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
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
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('error', 'sem_empresa')
      return NextResponse.redirect(url)
    }

    // Controle de acesso por perfil
    const perfil = usuario.perfil
    const SOMENTE_ADMIN = ['/config', '/logs', '/financeiro', '/caixa', '/despesas', '/comissoes', '/vendedores', '/entregadores', '/usuarios']

    // /perfil é acessível a todos os perfis (não bloquear)
    if (perfil === 'entregador' && !pathname.startsWith('/entregas') && !pathname.startsWith('/perfil') && !pathname.startsWith('/metas')) {
      const url = request.nextUrl.clone()
      url.pathname = '/entregas'
      return NextResponse.redirect(url)
    }

    if (perfil === 'vendedor' && SOMENTE_ADMIN.some(r => pathname.startsWith(r))) {
      const url = request.nextUrl.clone()
      url.pathname = '/pedidos'
      return NextResponse.redirect(url)
    }

    if (perfil !== 'admin' && SOMENTE_ADMIN.some(r => pathname.startsWith(r))) {
      const url = request.nextUrl.clone()
      url.pathname = perfil === 'entregador' ? '/entregas' : '/pedidos'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
