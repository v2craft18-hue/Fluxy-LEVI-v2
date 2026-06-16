// ================================================================
// FLUXY — API Route: Criar Usuário
// Usa service_role para criar no Supabase Auth + tabela usuarios.
//
// SEGURANÇA:
//   - Exige SUPABASE_SERVICE_ROLE_KEY no ambiente.
//   - Sem ela, a rota recusa com erro claro (sem fallback inseguro).
//   - Verifica autenticação + perfil admin + empresa do chamador.
//   - Rollback em auth.users se o INSERT em public.usuarios falhar.
// ================================================================
import { createServerClient } from '@supabase/ssr'
import { createServerSupabase } from '@/lib/supabase-server'
import { NextResponse, type NextRequest } from 'next/server'

// Mapa de mensagens de erro do Supabase Auth para português
function traduzirErroAuth(msg: string): string {
  if (msg.includes('User already registered') || msg.includes('already been registered'))
    return 'Este e-mail já está cadastrado no sistema.'
  if (msg.includes('invalid email') || msg.includes('Invalid email'))
    return 'Formato de e-mail inválido.'
  if (msg.includes('Password should be at least'))
    return 'A senha deve ter no mínimo 6 caracteres.'
  if (msg.includes('signup_disabled') || msg.includes('Signups not allowed'))
    return 'Cadastros estão desabilitados. Verifique as configurações do Supabase.'
  return msg
}

export async function POST(req: NextRequest) {
  try {
    // ── 1. Verificar SERVICE_ROLE_KEY ────────────────────────────
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      return NextResponse.json(
        {
          error: 'Configuração de servidor incompleta.',
          detalhe: 'A variável SUPABASE_SERVICE_ROLE_KEY não está definida no ambiente. ' +
            'Configure-a no painel da Vercel (Settings → Environment Variables) ' +
            'ou no arquivo .env.local para desenvolvimento.',
        },
        { status: 503 }
      )
    }

    // ── 2. Validar corpo da requisição ───────────────────────────
    const body = await req.json()
    const { nome, email, senha, perfil, empresa_id } = body

    if (!nome?.trim())       return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 })
    if (!email?.trim())      return NextResponse.json({ error: 'E-mail é obrigatório.' }, { status: 400 })
    if (!senha)              return NextResponse.json({ error: 'Senha é obrigatória.' }, { status: 400 })
    if (senha.length < 6)   return NextResponse.json({ error: 'Senha deve ter no mínimo 6 caracteres.' }, { status: 400 })
    if (!perfil)             return NextResponse.json({ error: 'Perfil é obrigatório.' }, { status: 400 })
    if (!empresa_id)         return NextResponse.json({ error: 'Empresa não identificada.' }, { status: 400 })

    const perfisValidos = ['admin', 'vendedor', 'entregador']
    if (!perfisValidos.includes(perfil)) {
      return NextResponse.json({ error: `Perfil inválido: "${perfil}".` }, { status: 400 })
    }

    // Validação básica de formato de e-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json({ error: 'Formato de e-mail inválido.' }, { status: 400 })
    }

    // ── 3. Autenticar o chamador e verificar permissões ──────────
    const supabaseUser = await createServerSupabase()
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Sessão expirada. Faça login novamente.' }, { status: 401 })
    }

    const { data: meuPerfil, error: perfilError } = await supabaseUser
      .from('usuarios')
      .select('perfil, empresa_id, ativo')
      .eq('id', user.id)
      .single()

    if (perfilError || !meuPerfil) {
      return NextResponse.json({ error: 'Perfil do administrador não encontrado.' }, { status: 403 })
    }
    if (!meuPerfil.ativo) {
      return NextResponse.json({ error: 'Conta desativada.' }, { status: 403 })
    }
    if (meuPerfil.perfil !== 'admin') {
      return NextResponse.json({ error: 'Apenas administradores podem criar usuários.' }, { status: 403 })
    }
    if (meuPerfil.empresa_id !== empresa_id) {
      return NextResponse.json({ error: 'Operação não permitida para esta empresa.' }, { status: 403 })
    }

    // ── 4. Criar conta em auth.users via Admin API ───────────────
    const adminClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
      { cookies: { getAll: () => [], setAll: () => {} } }
    )

    const { data: authUser, error: authErr } = await adminClient.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password: senha,
      email_confirm: true,           // confirma email automaticamente (sem fluxo de e-mail)
      user_metadata: { nome: nome.trim() },
    })

    if (authErr) {
      return NextResponse.json(
        { error: traduzirErroAuth(authErr.message) },
        { status: 422 }
      )
    }

    // ── 5. Criar registro em public.usuarios ─────────────────────
    const { error: dbErr } = await supabaseUser
      .from('usuarios')
      .insert({
        id:         authUser.user.id,   // mesmo UUID do auth.users (FK)
        nome:       nome.trim(),
        email:      email.trim().toLowerCase(),
        perfil,
        empresa_id,
        ativo:      true,
      })

    if (dbErr) {
      // Rollback: remover do auth para não deixar conta órfã
      await adminClient.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json(
        { error: 'Erro ao salvar usuário no banco. Tente novamente.', detalhe: dbErr.message },
        { status: 500 }
      )
    }

    // ── 6. Sucesso ───────────────────────────────────────────────
    return NextResponse.json({
      ok:    true,
      id:    authUser.user.id,
      email: authUser.user.email,
    })

  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro interno no servidor.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
