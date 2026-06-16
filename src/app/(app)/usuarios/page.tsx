'use client'

import { useState } from 'react'
import {
  useUsuarios, useCriarUsuario, useEditarUsuario,
  useAlternarStatusUsuario, useResetarSenhaUsuario,
} from '@/hooks/useUsuarios'
import type { Usuario, Perfil } from '@/types'
import { dataHoraBR, cn } from '@/lib/utils'
import {
  Plus, X, Pencil, UserX, UserCheck, KeyRound,
  Search, Shield, User, Truck,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAppStore } from '@/store'

// ── Helpers ─────────────────────────────────────────────────────
const PERFIL_LABEL: Record<Perfil, string> = {
  admin: 'Administrador', vendedor: 'Vendedor', entregador: 'Entregador',
}
const PERFIL_ICON: Record<Perfil, React.ElementType> = {
  admin: Shield, vendedor: User, entregador: Truck,
}
const PERFIL_COR: Record<Perfil, { bg: string; text: string }> = {
  admin:      { bg: 'bg-purple-100', text: 'text-purple-700' },
  vendedor:   { bg: 'bg-blue-100',   text: 'text-blue-700' },
  entregador: { bg: 'bg-teal-100',   text: 'text-teal-700' },
}

const SIZE_MAP: Record<number, string> = {
  9: 'w-9 h-9', 10: 'w-10 h-10', 11: 'w-11 h-11',
}

function Avatar({ u, size = 10 }: { u: Pick<Usuario, 'nome' | 'avatar_url'>; size?: number }) {
  const inicial = (u.nome || '?').charAt(0).toUpperCase()
  const cls = SIZE_MAP[size] ?? 'w-10 h-10'
  if (u.avatar_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={u.avatar_url} alt={u.nome} className={`${cls} rounded-full object-cover shrink-0`} />
  }
  return (
    <div className={`${cls} rounded-full bg-orange-500 flex items-center justify-center text-white text-sm font-bold shrink-0`}>
      {inicial}
    </div>
  )
}

// ════════════════════════════════════════════════════════
// MODAL CRIAR USUÁRIO
// ════════════════════════════════════════════════════════
function ModalCriarUsuario({ onClose }: { onClose: () => void }) {
  const criar = useCriarUsuario()
  const [form, setForm] = useState({
    nome: '', email: '', senha: '', confirmar: '', perfil: 'vendedor' as Perfil,
  })
  const f = (k: string) => (v: string) => setForm(p => ({ ...p, [k]: v }))

  async function handleSalvar() {
    if (!form.nome.trim()) return toast.error('Nome obrigatório.')
    if (!form.email.trim()) return toast.error('E-mail obrigatório.')
    if (form.senha.length < 6) return toast.error('Senha deve ter no mínimo 6 caracteres.')
    if (form.senha !== form.confirmar) return toast.error('As senhas não coincidem.')
    await criar.mutateAsync({ nome: form.nome, email: form.email, senha: form.senha, perfil: form.perfil })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 p-0 md:p-4">
      <div className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl max-h-[95vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold">Novo Usuário</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Nome *</label>
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={form.nome} onChange={e => f('nome')(e.target.value)} placeholder="Nome completo" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">E-mail *</label>
            <input type="email" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={form.email} onChange={e => f('email')(e.target.value)} placeholder="email@exemplo.com" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Perfil *</label>
            <div className="grid grid-cols-3 gap-2">
              {(['admin','vendedor','entregador'] as Perfil[]).map(p => {
                const Icon = PERFIL_ICON[p]
                const ativo = form.perfil === p
                return (
                  <button key={p} onClick={() => setForm(prev => ({ ...prev, perfil: p }))}
                    className={cn('border-2 rounded-xl py-3 flex flex-col items-center gap-1.5 text-xs font-semibold transition', ativo ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-500 hover:border-orange-200')}>
                    <Icon size={16} />{PERFIL_LABEL[p]}
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Senha Temporária *</label>
            <input type="password" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={form.senha} onChange={e => f('senha')(e.target.value)} placeholder="Mínimo 6 caracteres" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Confirmar Senha *</label>
            <input type="password" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={form.confirmar} onChange={e => f('confirmar')(e.target.value)} placeholder="Repetir senha" />
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
            <strong>Nota:</strong> informe as credenciais ao usuário. Ele poderá alterar a senha em Meu Perfil.
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Cancelar</button>
          <button onClick={handleSalvar} disabled={criar.isPending} className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white rounded-lg py-2.5 text-sm font-semibold transition">
            {criar.isPending ? 'Criando...' : 'Criar Usuário'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════
// MODAL EDITAR USUÁRIO
// ════════════════════════════════════════════════════════
function ModalEditarUsuario({ usuario, onClose }: { usuario: Usuario; onClose: () => void }) {
  const editar = useEditarUsuario()
  const [form, setForm] = useState({
    nome: usuario.nome ?? '', perfil: usuario.perfil,
    tel: usuario.tel ?? '', whatsapp: usuario.whatsapp ?? '',
  })
  const f = (k: string) => (v: string) => setForm(p => ({ ...p, [k]: v }))

  async function handleSalvar() {
    if (!form.nome.trim()) return toast.error('Nome obrigatório.')
    await editar.mutateAsync({ id: usuario.id, nome: form.nome, perfil: form.perfil, tel: form.tel || undefined, whatsapp: form.whatsapp || undefined })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 p-0 md:p-4">
      <div className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl max-h-[95vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold">Editar Usuário</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Nome *</label>
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={form.nome} onChange={e => f('nome')(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">E-mail</label>
            <input disabled className="w-full border border-gray-200 bg-gray-50 text-gray-400 rounded-lg px-3 py-2 text-sm" value={usuario.email} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Perfil *</label>
            <div className="grid grid-cols-3 gap-2">
              {(['admin','vendedor','entregador'] as Perfil[]).map(p => {
                const Icon = PERFIL_ICON[p]
                const ativo = form.perfil === p
                return (
                  <button key={p} onClick={() => setForm(prev => ({ ...prev, perfil: p }))}
                    className={cn('border-2 rounded-xl py-3 flex flex-col items-center gap-1.5 text-xs font-semibold transition', ativo ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-500 hover:border-orange-200')}>
                    <Icon size={16} />{PERFIL_LABEL[p]}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Telefone</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={form.tel} onChange={e => f('tel')(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">WhatsApp</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={form.whatsapp} onChange={e => f('whatsapp')(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Cancelar</button>
          <button onClick={handleSalvar} disabled={editar.isPending} className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white rounded-lg py-2.5 text-sm font-semibold transition">
            {editar.isPending ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════
// MODAL RESETAR SENHA
// ════════════════════════════════════════════════════════
function ModalResetarSenha({ usuario, onClose }: { usuario: Usuario; onClose: () => void }) {
  const resetar = useResetarSenhaUsuario()
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')

  async function handleSalvar() {
    if (novaSenha.length < 6) return toast.error('A senha deve ter no mínimo 6 caracteres.')
    if (novaSenha !== confirmar) return toast.error('As senhas não coincidem.')
    await resetar.mutateAsync({ id: usuario.id, novaSenha })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 p-0 md:p-4">
      <div className="bg-white w-full md:max-w-sm md:rounded-2xl rounded-t-2xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold flex items-center gap-2"><KeyRound size={16} /> Resetar Senha</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-500">Definir nova senha para <strong className="text-gray-700">{usuario.nome}</strong>.</p>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Nova Senha *</label>
            <input type="password" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} placeholder="Mínimo 6 caracteres" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Confirmar *</label>
            <input type="password" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={confirmar} onChange={e => setConfirmar(e.target.value)} placeholder="Repetir senha" />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Cancelar</button>
          <button onClick={handleSalvar} disabled={resetar.isPending} className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white rounded-lg py-2.5 text-sm font-semibold transition">
            {resetar.isPending ? 'Resetando...' : 'Resetar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════
// PÁGINA USUÁRIOS
// ════════════════════════════════════════════════════════
export default function UsuariosPage() {
  const meu = useAppStore(s => s.usuario)
  const { data: usuarios = [], isLoading } = useUsuarios()
  const alternar = useAlternarStatusUsuario()

  const [busca, setBusca] = useState('')
  const [filtroPerfil, setFiltroPerfil] = useState<Perfil | ''>('')
  const [modalCriar, setModalCriar] = useState(false)
  const [editando, setEditando] = useState<Usuario | null>(null)
  const [resetando, setResetando] = useState<Usuario | null>(null)

  const q = busca.toLowerCase()
  const filtrados = usuarios.filter(u =>
    (filtroPerfil === '' || u.perfil === filtroPerfil) &&
    (u.nome.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
  )

  const resumo = {
    total: usuarios.length,
    admin: usuarios.filter(u => u.perfil === 'admin').length,
    vendedor: usuarios.filter(u => u.perfil === 'vendedor').length,
    entregador: usuarios.filter(u => u.perfil === 'entregador').length,
  }

  function toggleStatus(u: Usuario) {
    if (u.id === meu?.id) return toast.error('Você não pode desativar a si mesmo.')
    alternar.mutate({ id: u.id, ativo: !u.ativo })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Usuários</h1>
        <button onClick={() => setModalCriar(true)} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
          <Plus size={15} /> Novo Usuário
        </button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { l: 'Total', v: resumo.total, c: 'border-l-gray-400' },
          { l: 'Admins', v: resumo.admin, c: 'border-l-purple-500' },
          { l: 'Vendedores', v: resumo.vendedor, c: 'border-l-blue-500' },
          { l: 'Entregadores', v: resumo.entregador, c: 'border-l-teal-500' },
        ].map(m => (
          <div key={m.l} className={cn('bg-white rounded-xl border border-gray-200 border-l-4 p-4', m.c)}>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">{m.l}</p>
            <p className="text-xl font-bold">{m.v}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400" placeholder="Buscar por nome ou e-mail..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <select value={filtroPerfil} onChange={e => setFiltroPerfil(e.target.value as Perfil | '')} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400">
          <option value="">Todos os perfis</option>
          <option value="admin">Administradores</option>
          <option value="vendedor">Vendedores</option>
          <option value="entregador">Entregadores</option>
        </select>
      </div>

      {/* Lista */}
      {isLoading ? <div className="text-center py-12 text-gray-400">Carregando...</div> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Usuário</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Perfil</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Último acesso</th>
                  <th className="text-center px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-12 text-gray-400">Nenhum usuário encontrado</td></tr>
                ) : filtrados.map(u => {
                  const cor = PERFIL_COR[u.perfil]
                  const ehEu = u.id === meu?.id
                  return (
                    <tr key={u.id} className={cn('border-t border-gray-100', !u.ativo && 'opacity-50')}>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <Avatar u={u} />
                          <div className="min-w-0">
                            <p className="font-semibold truncate">{u.nome}{ehEu && <span className="text-[10px] text-gray-400 font-normal ml-1">(você)</span>}</p>
                            <p className="text-xs text-gray-400 truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 hidden md:table-cell">
                        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', cor.bg, cor.text)}>{PERFIL_LABEL[u.perfil]}</span>
                      </td>
                      <td className="px-4 py-2.5 hidden lg:table-cell text-xs text-gray-400">
                        {u.ultimo_acesso ? dataHoraBR(u.ultimo_acesso) : 'Nunca'}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', u.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                          {u.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setEditando(u)} title="Editar" className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded transition"><Pencil size={14} /></button>
                          <button onClick={() => setResetando(u)} title="Resetar senha" className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"><KeyRound size={14} /></button>
                          <button onClick={() => toggleStatus(u)} disabled={ehEu} title={u.ativo ? 'Desativar' : 'Reativar'} className={cn('p-1.5 rounded transition', ehEu ? 'text-gray-200 cursor-not-allowed' : u.ativo ? 'text-gray-400 hover:text-red-600 hover:bg-red-50' : 'text-gray-400 hover:text-green-600 hover:bg-green-50')}>
                            {u.ativo ? <UserX size={14} /> : <UserCheck size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalCriar && <ModalCriarUsuario onClose={() => setModalCriar(false)} />}
      {editando && <ModalEditarUsuario usuario={editando} onClose={() => setEditando(null)} />}
      {resetando && <ModalResetarSenha usuario={resetando} onClose={() => setResetando(null)} />}
    </div>
  )
}
