// ================================================================
// FLUXY — API Route: Auto-cadastro (criação de empresa + admin)
//
// Chamada pelo register/page.tsx. Usa a Admin API para criar o
// usuário com email já confirmado (sem necessidade de e-mail de
// verificação), depois chama a RPC criar_empresa_com_admin.
// ================================================================
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

function traduzirErroAuth(msg: string): string {
  if (msg.includes('User already registered') || msg.includes('already been registered'))
    return 'Este e-mail já está cadastrado. Tente fazer login ou use outro e-mail.'
  if (msg.includes('invalid email') || msg.includes('Invalid email'))
    return 'Formato de e-mail inválido.'
  if (msg.includes('Password should be at least'))
    return 'A senha deve ter no mínimo 6 caracteres.'
  if (msg.includes('signup_disabled') || msg.includes('Signups not allowed'))
    return 'Cadastros estão desabilitados. Entre em contato com o suporte.'
  return msg
}

export async function POST(req: NextRequest) {
  try {
    console.log('[Fluxy-Auth] POST /api/register iniciado')
    
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!serviceKey || !supabaseUrl) {
      console.error('[Fluxy-Auth] SERVICE_ROLE_KEY ou URL não configurados')
      return NextResponse.json(
        { error: 'Configuração de servidor incompleta. Contate o suporte.' },
        { status: 503 }
      )
    }

    const body = await req.json()
    console.log('[Fluxy-Auth] Body recebido:', { 
      empresa_nome: body.empresa_nome, 
      email: body.email,
      admin_nome: body.admin_nome
    })
    
    const { empresa_nome, empresa_email, admin_nome, email, senha } = body

    if (!empresa_nome?.trim()) return NextResponse.json({ error: 'Nome da empresa obrigatório.' }, { status: 400 })
    if (!admin_nome?.trim())   return NextResponse.json({ error: 'Nome do administrador obrigatório.' }, { status: 400 })
    if (!email?.trim())        return NextResponse.json({ error: 'E-mail obrigatório.' }, { status: 400 })
    if (!senha || senha.length < 8) return NextResponse.json({ error: 'Senha deve ter no mínimo 8 caracteres.' }, { status: 400 })

    // Criar cliente admin (service_role bypassa RLS e confirma e-mail automaticamente)
    const adminClient = createServerClient(
      supabaseUrl,
      serviceKey,
      { cookies: { getAll: () => [], setAll: () => {} } }
    )

    // 1. Criar usuário no Supabase Auth com e-mail já confirmado
    console.log('[Fluxy-Auth] Criando usuário Auth...')
    const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password: senha,
      email_confirm: true,
      user_metadata: { nome: admin_nome.trim() },
    })

    if (authErr) {
      console.error('[Fluxy-Auth] Erro ao criar usuário Auth:', authErr.message)
      return NextResponse.json({ error: traduzirErroAuth(authErr.message) }, { status: 422 })
    }

    console.log('[Fluxy-Auth] Usuário Auth criado:', authData.user.id)

    // 2. Chamar RPC para criar empresa + vincular admin
    console.log('[Fluxy-Auth] Chamando RPC criar_empresa_com_admin...')
    const { error: rpcErr } = await adminClient.rpc('criar_empresa_com_admin', {
      p_empresa_nome:   empresa_nome.trim(),
      p_empresa_email:  empresa_email?.trim() || email.trim().toLowerCase(),
      p_admin_nome:     admin_nome.trim(),
      p_admin_user_id:  authData.user.id,
    })

    if (rpcErr) {
      console.error('[Fluxy-Auth] Erro RPC criar_empresa_com_admin:', rpcErr.message)
      // Rollback: remover usuário do auth para não deixar conta órfã
      await adminClient.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: 'Erro ao configurar empresa. Tente novamente.', detalhe: rpcErr.message },
        { status: 500 }
      )
    }

    console.log('[Fluxy-Auth] Empresa criada com sucesso para user:', authData.user.id)
    return NextResponse.json({ ok: true, userId: authData.user.id })

  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro interno no servidor.'
    console.error('[Fluxy-Auth] Exception em POST /api/register:', msg, e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
