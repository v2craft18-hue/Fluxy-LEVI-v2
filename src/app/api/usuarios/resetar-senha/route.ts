// ================================================================
// FLUXY — API Route: Resetar Senha de Usuário (admin)
//
// Permite que um admin defina uma nova senha para outro usuário da
// mesma empresa. Requer SUPABASE_SERVICE_ROLE_KEY (Admin API).
// ================================================================
import { createServerClient } from '@supabase/ssr'
import { createServerSupabase } from '@/lib/supabase-server'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    // ── 1. Verificar SERVICE_ROLE_KEY ────────────────────────────
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      return NextResponse.json(
        {
          error: 'Configuração de servidor incompleta.',
          detalhe: 'A variável SUPABASE_SERVICE_ROLE_KEY não está definida no ambiente.',
        },
        { status: 503 }
      )
    }

    // ── 2. Validar corpo ─────────────────────────────────────────
    const { id, novaSenha } = await req.json()
    if (!id) return NextResponse.json({ error: 'ID do usuário é obrigatório.' }, { status: 400 })
    if (!novaSenha || novaSenha.length < 6) {
      return NextResponse.json({ error: 'A nova senha deve ter no mínimo 6 caracteres.' }, { status: 400 })
    }

    // ── 3. Autenticar e verificar permissões ─────────────────────
    const supabaseUser = await createServerSupabase()
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Sessão expirada. Faça login novamente.' }, { status: 401 })
    }

    const { data: meuPerfil, error: perfilError } = await supabaseUser
      .from('usuarios')
      .select('perfil, empresa_id')
      .eq('id', user.id)
      .single()

    if (perfilError || !meuPerfil) {
      return NextResponse.json({ error: 'Perfil do administrador não encontrado.' }, { status: 403 })
    }
    if (meuPerfil.perfil !== 'admin') {
      return NextResponse.json({ error: 'Apenas administradores podem resetar senhas.' }, { status: 403 })
    }

    // ── 4. Verificar que o alvo é da mesma empresa ───────────────
    const { data: alvo, error: alvoError } = await supabaseUser
      .from('usuarios')
      .select('empresa_id')
      .eq('id', id)
      .single()

    if (alvoError || !alvo) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 })
    }
    if (alvo.empresa_id !== meuPerfil.empresa_id) {
      return NextResponse.json({ error: 'Operação não permitida para esta empresa.' }, { status: 403 })
    }

    // ── 5. Atualizar senha via Admin API ─────────────────────────
    const adminClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
      { cookies: { getAll: () => [], setAll: () => {} } }
    )

    const { error: updErr } = await adminClient.auth.admin.updateUserById(id, {
      password: novaSenha,
    })
    if (updErr) {
      return NextResponse.json({ error: 'Erro ao resetar senha: ' + updErr.message }, { status: 422 })
    }

    return NextResponse.json({ ok: true })

  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro interno no servidor.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
