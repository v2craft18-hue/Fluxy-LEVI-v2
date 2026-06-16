'use client'
import { useState } from 'react'
import { useEntregadores, useSalvarEntregador } from '@/hooks/usePedidos'
import { Plus, X, Pencil } from 'lucide-react'
import type { Entregador } from '@/types'

function ModalEntregador({ entregador, onClose }: { entregador?: Entregador; onClose: () => void }) {
  const salvar = useSalvarEntregador()
  const [form, setForm] = useState({
    nome: entregador?.nome ?? '', tel: entregador?.tel ?? '', whats: entregador?.whats ?? '',
    veiculo: entregador?.veiculo ?? '', placa: entregador?.placa ?? '',
  })
  const f = (k: string) => (v: string) => setForm(p => ({ ...p, [k]: v }))

  async function handleSalvar() {
    if (!form.nome.trim()) return
    await salvar.mutateAsync({ ...(entregador?.id ? { id: entregador.id } : {}), ...form })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 p-0 md:p-4">
      <div className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold">{entregador ? 'Editar Entregador' : 'Novo Entregador'}</h2>
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
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Veículo</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={form.veiculo} onChange={e => f('veiculo')(e.target.value)} placeholder="Moto, Carro..." />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Placa</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={form.placa} onChange={e => f('placa')(e.target.value.toUpperCase())} />
            </div>
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

export default function EntregadoresPage() {
  const { data: entregadores = [], isLoading } = useEntregadores()
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<Entregador | undefined>()

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Entregadores</h1>
        <button onClick={() => { setEditando(undefined); setModal(true) }} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
          <Plus size={15} /> Novo Entregador
        </button>
      </div>
      {isLoading ? <div className="text-center py-12 text-gray-400">Carregando...</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {entregadores.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-400">Nenhum entregador cadastrado</div>
          ) : entregadores.map(e => (
            <div key={e.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:border-orange-200 transition">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-sm">{e.nome}</p>
                  {e.veiculo && <p className="text-xs text-gray-400 mt-0.5">🚗 {e.veiculo} {e.placa ? `— ${e.placa}` : ''}</p>}
                  {e.tel && <p className="text-xs text-gray-400 mt-0.5">📞 {e.tel}</p>}
                </div>
                <button onClick={() => { setEditando(e); setModal(true) }} className="text-gray-400 hover:text-orange-500 transition p-1"><Pencil size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {modal && <ModalEntregador entregador={editando} onClose={() => { setModal(false); setEditando(undefined) }} />}
    </div>
  )
}
