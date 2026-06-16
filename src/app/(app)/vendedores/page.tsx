'use client'
import { useState } from 'react'
import { useVendedores, useSalvarVendedor } from '@/hooks/usePedidos'
import { moeda } from '@/lib/utils'
import { Plus, X, Pencil } from 'lucide-react'
import type { Vendedor } from '@/types'

function ModalVendedor({ vendedor, onClose }: { vendedor?: Vendedor; onClose: () => void }) {
  const salvar = useSalvarVendedor()
  const [form, setForm] = useState({
    nome: vendedor?.nome ?? '', tel: vendedor?.tel ?? '', whats: vendedor?.whats ?? '',
    com_tipo: vendedor?.com_tipo ?? 'pct' as 'pct'|'fixo',
    com_pct: String(vendedor?.com_pct ?? '5'), com_fixo: String(vendedor?.com_fixo ?? '0'),
  })
  const f = (k: string) => (v: any) => setForm(p => ({ ...p, [k]: v }))

  async function handleSalvar() {
    if (!form.nome.trim()) return
    const payload = { ...form, com_pct: parseFloat(form.com_pct as string) || 0, com_fixo: parseFloat(form.com_fixo as string) || 0 }
    await salvar.mutateAsync({ ...(vendedor?.id ? { id: vendedor.id } : {}), ...payload })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 p-0 md:p-4">
      <div className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold">{vendedor ? 'Editar Vendedor' : 'Novo Vendedor'}</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Nome *</label>
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={form.nome} onChange={e => f('nome')(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Telefone</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={form.tel} onChange={e => f('tel')(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">WhatsApp</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={form.whats} onChange={e => f('whats')(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Tipo de Comissão</label>
            <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={form.com_tipo} onChange={e => f('com_tipo')(e.target.value)}>
              <option value="pct">Percentual (%)</option>
              <option value="fixo">Valor Fixo (R$)</option>
            </select>
          </div>
          {form.com_tipo === 'pct' ? (
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Percentual (%)</label>
              <input type="number" min={0} max={100} step={0.5} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={form.com_pct} onChange={e => f('com_pct')(e.target.value)} />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Valor Fixo (R$)</label>
              <input type="number" min={0} step={0.01} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={form.com_fixo} onChange={e => f('com_fixo')(e.target.value)} />
            </div>
          )}
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

export default function VendedoresPage() {
  const { data: vendedores = [], isLoading } = useVendedores()
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<Vendedor | undefined>()

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Vendedores</h1>
        <button onClick={() => { setEditando(undefined); setModal(true) }} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
          <Plus size={15} /> Novo Vendedor
        </button>
      </div>
      {isLoading ? <div className="text-center py-12 text-gray-400">Carregando...</div> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <th className="text-left px-4 py-3">Nome</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Contato</th>
              <th className="text-left px-4 py-3">Comissão</th>
              <th className="w-12"></th>
            </tr></thead>
            <tbody>
              {vendedores.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-12 text-gray-400">Nenhum vendedor cadastrado</td></tr>
              ) : vendedores.map(v => (
                <tr key={v.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">{v.nome.charAt(0)}</div>
                      <span className="font-semibold">{v.nome}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">{v.tel || v.whats || '—'}</td>
                  <td className="px-4 py-3 text-xs">
                    {v.com_tipo === 'pct' ? `${v.com_pct}%` : moeda(v.com_fixo)}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => { setEditando(v); setModal(true) }} className="text-gray-400 hover:text-orange-500 transition"><Pencil size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {modal && <ModalVendedor vendedor={editando} onClose={() => { setModal(false); setEditando(undefined) }} />}
    </div>
  )
}
