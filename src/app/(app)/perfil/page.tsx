'use client'

import { useState, useEffect, useRef } from 'react'
import { useAppStore } from '@/store'
import {
  useAtualizarMeuPerfil, useAlterarSenha, useUploadAvatar,
} from '@/hooks/useUsuarios'
import { Camera, Lock, Save, X, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

// ── Indicador de força de senha ─────────────────────────────────
function forcaSenha(s: string): { nivel: number; label: string; cor: string } {
  let n = 0
  if (s.length >= 6) n++
  if (s.length >= 10) n++
  if (/[A-Z]/.test(s) && /[a-z]/.test(s)) n++
  if (/\d/.test(s)) n++
  if (/[^A-Za-z0-9]/.test(s)) n++
  const labels = ['Muito fraca', 'Fraca', 'Média', 'Boa', 'Forte']
  const cores = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#16a34a']
  const idx = Math.min(n, 5) - 1
  return { nivel: n, label: idx >= 0 ? labels[idx] : '', cor: idx >= 0 ? cores[idx] : '#e5e7eb' }
}

// ════════════════════════════════════════════════════════
// MODAL ALTERAR SENHA
// ════════════════════════════════════════════════════════
function ModalAlterarSenha({ onClose }: { onClose: () => void }) {
  const alterar = useAlterarSenha()
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [mostrar, setMostrar] = useState(false)

  const forca = forcaSenha(novaSenha)

  async function handleSalvar() {
    if (!senhaAtual) return toast.error('Informe a senha atual.')
    if (novaSenha.length < 6) return toast.error('A nova senha deve ter no mínimo 6 caracteres.')
    if (novaSenha !== confirmar) return toast.error('As senhas não coincidem.')
    if (novaSenha === senhaAtual) return toast.error('A nova senha deve ser diferente da atual.')
    await alterar.mutateAsync({ senhaAtual, novaSenha })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 p-0 md:p-4">
      <div className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold flex items-center gap-2"><Lock size={16} /> Alterar Senha</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Senha Atual *</label>
            <div className="relative">
              <input
                type={mostrar ? 'text' : 'password'}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400 pr-9"
                value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)}
                placeholder="Sua senha atual"
              />
              <button type="button" onClick={() => setMostrar(m => !m)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {mostrar ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Nova Senha *</label>
            <input
              type={mostrar ? 'text' : 'password'}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
              value={novaSenha} onChange={e => setNovaSenha(e.target.value)}
              placeholder="Mínimo 6 caracteres"
            />
            {novaSenha && (
              <div className="mt-1.5">
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${(forca.nivel / 5) * 100}%`, background: forca.cor }} />
                </div>
                <p className="text-[10px] mt-0.5" style={{ color: forca.cor }}>{forca.label}</p>
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Confirmar Nova Senha *</label>
            <input
              type={mostrar ? 'text' : 'password'}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
              value={confirmar} onChange={e => setConfirmar(e.target.value)}
              placeholder="Repita a nova senha"
            />
            {confirmar && novaSenha !== confirmar && <p className="text-[10px] text-red-500 mt-0.5">As senhas não coincidem.</p>}
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Cancelar</button>
          <button onClick={handleSalvar} disabled={alterar.isPending} className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white rounded-lg py-2.5 text-sm font-semibold transition">
            {alterar.isPending ? 'Salvando...' : 'Alterar Senha'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════
// PÁGINA PERFIL
// ════════════════════════════════════════════════════════
export default function PerfilPage() {
  const usuario = useAppStore(s => s.usuario)
  const atualizar = useAtualizarMeuPerfil()
  const upload = useUploadAvatar()
  const fileRef = useRef<HTMLInputElement>(null)

  const [nome, setNome] = useState('')
  const [tel, setTel] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [modalSenha, setModalSenha] = useState(false)

  useEffect(() => {
    if (usuario) {
      setNome(usuario.nome ?? '')
      setTel(usuario.tel ?? '')
      setWhatsapp(usuario.whatsapp ?? '')
    }
  }, [usuario])

  // Abrir modal de senha automaticamente se vier de /perfil#senha
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#senha') {
      setModalSenha(true)
    }
  }, [])

  if (!usuario) return <div className="text-center py-12 text-gray-400">Carregando...</div>

  const inicial = (usuario.nome || '?').charAt(0).toUpperCase()

  async function handleSalvar() {
    if (!nome.trim()) return toast.error('O nome é obrigatório.')
    await atualizar.mutateAsync({ nome: nome.trim(), tel: tel || undefined, whatsapp: whatsapp || undefined })
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return toast.error('Selecione uma imagem.')
    if (file.size > 2 * 1024 * 1024) return toast.error('A imagem deve ter no máximo 2MB.')
    upload.mutate(file)
  }

  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="text-xl font-bold">Meu Perfil</h1>

      {/* Avatar */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
        <div className="relative">
          {usuario.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={usuario.avatar_url} alt={usuario.nome} className="w-20 h-20 rounded-full object-cover" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-orange-500 flex items-center justify-center text-white text-2xl font-bold">{inicial}</div>
          )}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={upload.isPending}
            className="absolute -bottom-1 -right-1 bg-white border border-gray-200 rounded-full p-1.5 shadow-sm hover:bg-gray-50 disabled:opacity-60"
            title="Trocar foto"
          >
            <Camera size={14} className="text-gray-600" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </div>
        <div>
          <p className="font-bold">{usuario.nome}</p>
          <p className="text-sm text-gray-500">{usuario.email}</p>
          <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 capitalize">{usuario.perfil}</span>
          {upload.isPending && <p className="text-[10px] text-gray-400 mt-1">Enviando foto...</p>}
        </div>
      </div>

      {/* Dados */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Dados Pessoais</p>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Nome *</label>
          <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={nome} onChange={e => setNome(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Telefone</label>
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={tel} onChange={e => setTel(e.target.value)} placeholder="(11) 9xxxx-xxxx" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">WhatsApp</label>
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="(11) 9xxxx-xxxx" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">E-mail</label>
          <input disabled className="w-full border border-gray-200 bg-gray-50 text-gray-400 rounded-lg px-3 py-2 text-sm" value={usuario.email} />
          <p className="text-[10px] text-gray-400 mt-0.5">O e-mail não pode ser alterado.</p>
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={() => setModalSenha(true)} className="flex items-center gap-2 border border-gray-300 rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
            <Lock size={14} /> Alterar Senha
          </button>
          <button onClick={handleSalvar} disabled={atualizar.isPending} className="flex items-center gap-2 ml-auto bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white rounded-lg px-4 py-2 text-sm font-semibold transition">
            <Save size={14} /> {atualizar.isPending ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      {modalSenha && <ModalAlterarSenha onClose={() => setModalSenha(false)} />}
    </div>
  )
}
