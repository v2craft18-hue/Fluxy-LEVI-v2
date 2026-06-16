'use client'
import { useState, useMemo } from 'react'
import { useClientes, useSalvarCliente, useExcluirCliente } from '@/hooks/usePedidos'
import { waLink } from '@/lib/utils'
import { Plus, Search, X, Phone, MessageCircle, MapPin, Pencil, Trash2 } from 'lucide-react'
import type { Cliente } from '@/types'
import { useAppStore } from '@/store'


// ── Máscaras ──────────────────────────────────────────
function maskCPF(v: string) {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}
function maskCNPJ(v: string) {
  return v.replace(/\D/g, '').slice(0, 14)
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}
function maskFone(v: string) {
  const n = v.replace(/\D/g, '').slice(0, 11)
  if (n.length <= 10) return n.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim()
  return n.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim()
}
function maskCEP(v: string) {
  return v.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d{0,3})/, '$1-$2').replace(/-$/, '')
}

function ModalCliente({ cliente, onClose }: { cliente?: Cliente; onClose: () => void }) {
  const salvar = useSalvarCliente()
  const [form, setForm] = useState({
    nome: cliente?.nome ?? '', cpf: cliente?.cpf ?? '',
    rg: cliente?.rg ?? '', cnpj: cliente?.cnpj ?? '',
    ie: cliente?.ie ?? '',
    email: cliente?.email ?? '',
    tel: cliente?.tel ?? '', whats: cliente?.whats ?? '',
    cep: cliente?.cep ?? '',
    rua: cliente?.rua ?? '', num: cliente?.num ?? '', comp: cliente?.comp ?? '',
    bairro: cliente?.bairro ?? '', cidade: cliente?.cidade ?? '',
    estado: cliente?.estado ?? '', obs: cliente?.obs ?? '',
  })
  const f = (k: string) => (v: string) => setForm(p => ({ ...p, [k]: v }))

  async function handleSalvar() {
    if (!form.nome.trim()) return
    await salvar.mutateAsync({ ...(cliente?.id ? { id: cliente.id } : {}), ...form })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 p-0 md:p-4">
      <div className="bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-2xl max-h-[95vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold">{cliente ? 'Editar Cliente' : 'Novo Cliente'}</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Nome *</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={form.nome} onChange={e => f('nome')(e.target.value)} placeholder="Nome completo" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Telefone</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={form.tel} onChange={e => f('tel')(maskFone(e.target.value))} placeholder="(11) 9xxxx-xxxx" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">WhatsApp</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={form.whats} onChange={e => f('whats')(maskFone(e.target.value))} placeholder="(11) 9xxxx-xxxx" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">CPF</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={form.cpf} onChange={e => f('cpf')(maskCPF(e.target.value))} placeholder="000.000.000-00" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">E-mail</label>
              <input type="email" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={form.email} onChange={e => f('email')(e.target.value)} placeholder="email@exemplo.com" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">RG</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={form.rg} onChange={e => f('rg')(e.target.value.replace(/\D/g,'').slice(0,12))} placeholder="0000000" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">CNPJ</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={form.cnpj} onChange={e => f('cnpj')(maskCNPJ(e.target.value))} placeholder="00.000.000/0000-00" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Insc. Estadual</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={form.ie} onChange={e => f('ie')(e.target.value.replace(/\D/g,''))} placeholder="000000000000" />
            </div>
          </div>
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Endereço</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">CEP</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={form.cep} onChange={e => f('cep')(maskCEP(e.target.value))} placeholder="00000-000" />
              </div>
            <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Rua</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={form.rua} onChange={e => f('rua')(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Número</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={form.num} onChange={e => f('num')(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Comp.</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={form.comp} onChange={e => f('comp')(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Bairro</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={form.bairro} onChange={e => f('bairro')(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Cidade</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={form.cidade} onChange={e => f('cidade')(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">UF</label>
                <input maxLength={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={form.estado} onChange={e => f('estado')(e.target.value.toUpperCase())} />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Observações</label>
            <textarea rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400 resize-none" value={form.obs} onChange={e => f('obs')(e.target.value)} />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={handleSalvar} disabled={salvar.isPending || !form.nome.trim()} className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white rounded-lg py-2.5 text-sm font-semibold">
            {salvar.isPending ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ClientesPage() {
  const usuarioAtual = useAppStore(s => s.usuario)
  // Vendedor vê apenas os próprios clientes (clientes.vend_id = usuarios.id); admin vê todos.
  const filtroVend = usuarioAtual?.perfil === 'vendedor' ? (usuarioAtual.id ?? '__none__') : undefined
  const { data: clientes = [], isLoading } = useClientes(filtroVend ? { vend_id: filtroVend } : undefined)
  const excluir = useExcluirCliente()
  const [busca, setBusca] = useState('')
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<Cliente | undefined>()

  const filtrados = useMemo(() => {
    const q = busca.toLowerCase()
    return clientes.filter(c =>
      c.nome.toLowerCase().includes(q) ||
      c.tel?.includes(q) ||
      c.cidade?.toLowerCase().includes(q) ||
      c.cpf?.replace(/\D/g, '').includes(q.replace(/\D/g, '')) ||
      c.cnpj?.replace(/\D/g, '').includes(q.replace(/\D/g, '')) ||
      c.email?.toLowerCase().includes(q)
    )
  }, [clientes, busca])

  function abrirEditar(c: Cliente) { setEditando(c); setModal(true) }
  function fechar() { setModal(false); setEditando(undefined) }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Clientes <span className="text-gray-400 text-sm font-normal">({clientes.length})</span></h1>
        <button onClick={() => setModal(true)} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
          <Plus size={15} /> Novo Cliente
        </button>
      </div>

      <div className="relative mb-4">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400" placeholder="Buscar por nome, telefone ou cidade..." value={busca} onChange={e => setBusca(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtrados.length === 0 ? (
            <div className="col-span-full text-center py-16 text-gray-400">
              <p className="text-sm">Nenhum cliente encontrado</p>
              <button onClick={() => setModal(true)} className="mt-2 text-orange-500 text-xs font-semibold hover:underline">+ Cadastrar primeiro cliente</button>
            </div>
          ) : filtrados.map(c => (
            <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:border-orange-200 transition">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{c.nome}</p>
                  {c.cidade && <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><MapPin size={10} />{c.cidade}{c.estado ? `/${c.estado}` : ''}</p>}
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <button onClick={() => abrirEditar(c)} className="text-gray-400 hover:text-orange-500 p-1 transition"><Pencil size={13} /></button>
                  <button onClick={() => { if (confirm(`Remover ${c.nome}?`)) excluir.mutate(c.id) }} className="text-gray-400 hover:text-red-500 p-1 transition"><Trash2 size={13} /></button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {c.tel && (
                  <a href={`tel:${c.tel}`} className="flex items-center gap-1 text-xs text-gray-500 hover:text-orange-500 transition">
                    <Phone size={11} />{c.tel}
                  </a>
                )}
                {c.whats && (
                  <a href={waLink(c.whats)} target="_blank" rel="noopener" className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 transition">
                    <MessageCircle size={11} />WhatsApp
                  </a>
                )}
              </div>
              {c.rua && <p className="text-xs text-gray-400 mt-1.5 truncate">{c.rua}, {c.num} {c.bairro ? `— ${c.bairro}` : ''}</p>}
            </div>
          ))}
        </div>
      )}

      {modal && <ModalCliente cliente={editando} onClose={fechar} />}
    </div>
  )
}
