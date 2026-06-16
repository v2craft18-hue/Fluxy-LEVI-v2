// ================================================================
// FLUXY — Hooks de Gestão de Usuários
// ================================================================
'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import type { Usuario, Perfil } from '@/types'
import { useAppStore } from '@/store'

// ── Listar usuários da empresa ──────────────────────────────────
export function useUsuarios() {
  return useQuery({
    queryKey: ['usuarios'],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nome, email, perfil, ativo, tel, whatsapp, avatar_url, ultimo_acesso, criado_em, atualizado_em')
        .order('nome')
      if (error) throw error
      return data as Usuario[]
    },
  })
}

// ── Criar usuário (via Admin API do Supabase) ───────────────────
export type CriarUsuarioForm = {
  nome: string
  email: string
  senha: string
  perfil: Perfil
}

export function useCriarUsuario() {
  const qc = useQueryClient()
  const { empresaId } = useAppStore()

  return useMutation({
    mutationFn: async (form: CriarUsuarioForm) => {
      if (!empresaId) throw new Error('Empresa não identificada.')

      const res = await fetch('/api/usuarios/criar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, empresa_id: empresaId }),
      })

      const json = await res.json()

      if (!res.ok) {
        const mensagem = res.status === 503 && json.detalhe
          ? `${json.error} ${json.detalhe}`
          : (json.error || 'Erro ao criar usuário.')
        throw new Error(mensagem)
      }

      return json
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] })
      toast.success('Usuário criado com sucesso!')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

// ── Editar usuário (admin ou próprio) ──────────────────────────
export type EditarUsuarioForm = {
  id: string
  nome: string
  perfil?: Perfil
  tel?: string
  whatsapp?: string
  ativo?: boolean
}

export function useEditarUsuario() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (form: EditarUsuarioForm) => {
      const supabase = createClient()
      const { id, ...rest } = form
      const { error } = await supabase
        .from('usuarios')
        .update(rest)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] })
      toast.success('Usuário atualizado!')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

// ── Desativar / reativar ────────────────────────────────────────
export function useAlternarStatusUsuario() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const supabase = createClient()
      const { error } = await supabase
        .from('usuarios')
        .update({ ativo })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['usuarios'] })
      toast.success(vars.ativo ? 'Usuário reativado.' : 'Usuário desativado.')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

// ── Excluir usuário (admin only) ────────────────────────────────
export function useExcluirUsuario() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch('/api/usuarios/excluir', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erro ao excluir usuário.')
      return json
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['usuarios'] })
      if (data?.modo === 'desativado') {
        toast.success('Usuário desativado.')
      } else {
        toast.success('Usuário excluído permanentemente.')
      }
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

// ── Resetar senha de outro usuário (admin only) ────────────────
export function useResetarSenhaUsuario() {
  return useMutation({
    mutationFn: async ({ id, novaSenha }: { id: string; novaSenha: string }) => {
      const res = await fetch('/api/usuarios/resetar-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, novaSenha }),
      })
      const json = await res.json()
      if (!res.ok) {
        const mensagem = res.status === 503 && json.detalhe
          ? `${json.error} ${json.detalhe}`
          : (json.error || 'Erro ao resetar senha.')
        throw new Error(mensagem)
      }
      return json
    },
    onSuccess: () => toast.success('Senha resetada com sucesso!'),
    onError: (e: Error) => toast.error(e.message),
  })
}

// ── Atualizar próprio perfil ────────────────────────────────────
export type AtualizarPerfilForm = {
  nome: string
  tel?: string
  whatsapp?: string
  avatar_url?: string
}

export function useAtualizarMeuPerfil() {
  const qc = useQueryClient()
  const { usuario, setUsuario, empresaId } = useAppStore()

  return useMutation({
    mutationFn: async (form: AtualizarPerfilForm) => {
      const supabase = createClient()
      if (!usuario?.id) throw new Error('Usuário não identificado')
      const { error } = await supabase
        .from('usuarios')
        .update(form)
        .eq('id', usuario.id)
      if (error) throw error
      await supabase.auth.updateUser({ data: { nome: form.nome } })
    },
    onSuccess: (_, form) => {
      if (usuario) {
        setUsuario({ ...usuario, ...form }, empresaId)
      }
      qc.invalidateQueries({ queryKey: ['usuarios'] })
      toast.success('Perfil atualizado!')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

// ── Alterar senha ────────────────────────────────────────────────
export function useAlterarSenha() {
  return useMutation({
    mutationFn: async ({ senhaAtual, novaSenha }: { senhaAtual: string; novaSenha: string }) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) throw new Error('Usuário não encontrado')

      const { error: errLogin } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: senhaAtual,
      })
      if (errLogin) throw new Error('Senha atual incorreta')

      const { error } = await supabase.auth.updateUser({ password: novaSenha })
      if (error) throw error
    },
    onSuccess: () => toast.success('Senha alterada com sucesso!'),
    onError: (e: Error) => toast.error(e.message),
  })
}

// ── Upload de avatar ────────────────────────────────────────────
export function useUploadAvatar() {
  const qc = useQueryClient()
  const { usuario, setUsuario, empresaId } = useAppStore()

  return useMutation({
    mutationFn: async (file: File) => {
      const supabase = createClient()
      if (!usuario?.id) throw new Error('Usuário não identificado')
      const ext = file.name.split('.').pop()
      const path = `${usuario.id}/avatar.${ext}`

      const { error: errUp } = await supabase.storage
        .from('avatares')
        .upload(path, file, { upsert: true })
      if (errUp) throw errUp

      const { data } = supabase.storage.from('avatares').getPublicUrl(path)
      const url = data.publicUrl + '?t=' + Date.now()

      const { error: errDb } = await supabase
        .from('usuarios')
        .update({ avatar_url: url })
        .eq('id', usuario.id)
      if (errDb) throw errDb

      return url
    },
    onSuccess: (url) => {
      if (usuario) setUsuario({ ...usuario, avatar_url: url }, empresaId)
      qc.invalidateQueries({ queryKey: ['usuarios'] })
      toast.success('Foto atualizada!')
    },
    onError: (e: Error) => toast.error('Erro ao enviar foto: ' + e.message),
  })
}
