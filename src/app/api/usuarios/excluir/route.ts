// ================================================================
// FLUXY — API Route: Excluir Usuário
//
// ESTRATÉGIA:
//   - COM service_role: exclui de auth.users + public.usuarios (hard delete)
//   - SEM service_role: só desativa (ativo=false). Não faz hard delete
//     para evitar deixar conta em auth.users órfã sem registro no banco.
// ================================================================
import { createServerClient } from '@supabase/ssr'
import { createServerSupabase } from '@/lib/supabase-server'
import { NextResponse, type NextRequest } from 'next/server'

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'ID obrigatório.' }, { status: 400 })

    // ── 1. Autenticar e verificar permissões ─────────────────────
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
    if (meuPerfil.perfil !== 'admin') {
      return NextResponse.json({ error: 'Apenas administradores podem excluir usuários.' }, { status: 403 })
    }
    if (id === user.id) {
      return NextResponse.json({ error: 'Não é possível excluir o próprio usuário.' }, { status: 400 })
    }

    // ── 2. Verificar que o alvo pertence à mesma empresa ─────────
    const { data: alvo, error: alvoError } = await supabaseUser
      .from('usuarios')
      .select('empresa_id, email')
      .eq('id', id)
      .single()

    if (alvoError || !alvo) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 })
    }
    if (alvo.empresa_id !== meuPerfil.empresa_id) {
      return NextResponse.json({ error: 'Operação não permitida para esta empresa.' }, { status: 403 })
    }

    // ── 3. Executar exclusão ─────────────────────────────────────
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (serviceKey) {
      // Hard delete: remover do auth + tabela (ON DELETE CASCADE cuida das FKs)
      const adminClient = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceKey,
        { cookies: { getAll: () => [], setAll: () => {} } }
      )

      // Soft-delete primeiro como segurança (invalida sessões ativas)
      await supabaseUser.from('usuarios').update({ ativo: false }).eq('id', id)

      // Deletar do auth (isso dispara ON DELETE CASCADE em public.usuarios)
      const { error: authDelErr } = await adminClient.auth.admin.deleteUser(id)
      if (authDelErr) {
        // Se falhar no auth, reverter soft-delete e informar
        await supabaseUser.from('usuarios').update({ ativo: true }).eq('id', id)
        throw new Error('Erro ao remover conta de autenticação: ' + authDelErr.message)
      }

      // A linha em public.usuarios já foi removida pelo CASCADE,
      // mas tentamos um delete explícito como garantia extra (idempotente)
      await supabaseUser.from('usuarios').delete().eq('id', id)

    } else {
      // Sem service_role: apenas desativar (soft delete)
      // Não fazemos hard delete para não deixar o auth.users órfão
      const { error: softErr } = await supabaseUser
        .from('usuarios')
        .update({ ativo: false })
        .eq('id', id)
      if (softErr) throw new Error(softErr.message)

      return NextResponse.json({
        ok:    true,
        modo:  'desativado',
        aviso: 'Usuário desativado (não excluído permanentemente). Configure SUPABASE_SERVICE_ROLE_KEY para habilitar exclusão definitiva.',
      })
    }

    return NextResponse.json({ ok: true, modo: 'excluido' })

  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro interno no servidor.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
