'use client'
import { useState, useMemo } from 'react'
import { useProdutos, useSalvarProduto } from '@/hooks/usePedidos'
import { moeda } from '@/lib/utils'
import { Plus, Search, X, Pencil, Package } from 'lucide-react'
import type { Produto } from '@/types'
import { createClient } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'

function useCategorias() {
  return useQuery({
    queryKey: ['categorias'],
    queryFn: async () => {
      const { data } = await createClient().from('categorias').select('id, nome').order('nome')
      return data ?? []
    },
  })
}

function ModalProduto({ produto, onClose }: { produto?: Produto; onClose: () => void }) {
  const salvar = useSalvarProduto()
  const { data: categorias = [] } = useCategorias()
  const [form, setForm] = useState({
    nome: produto?.nome ?? '', cat_id: produto?.cat_id ?? '',
    preco: String(produto?.preco ?? ''), custo: String(produto?.custo ?? ''),
    est: String(produto?.est ?? ''), min: String(produto?.min ?? ''),
    descricao: produto?.descricao ?? '',
  })
  const f = (k: string) => (v: string) => setForm(p => ({ ...p, [k]: v }))

  async function handleSalvar() {
    if (!form.nome.trim()) return
    const payload = {
      ...form,
      preco: parseFloat(form.preco) || 0,
      custo: parseFloat(form.custo) || 0,
      est: parseFloat(form.est) || 0,
      min: parseFloat(form.min) || 0,
    }
    await salvar.mutateAsync({ ...(produto?.id ? { id: produto.id } : {}), ...payload })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 p-0 md:p-4">
      <div className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl max-h-[95vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold">{produto ? 'Editar Produto' : 'Novo Produto'}</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Nome *</label>
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={form.nome} onChange={e => f('nome')(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Categoria</label>
            <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={form.cat_id} onChange={e => f('cat_id')(e.target.value)}>
              <option value="">Sem categoria</option>
              {categorias.map((c: any) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Preço Venda (R$)</label>
              <input type="number" min={0} step={0.01} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={form.preco} onChange={e => f('preco')(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Custo (R$)</label>
              <input type="number" min={0} step={0.01} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={form.custo} onChange={e => f('custo')(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Estoque</label>
              <input type="number" min={0} step={0.001} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={form.est} onChange={e => f('est')(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Estoque Mínimo</label>
              <input type="number" min={0} step={0.001} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={form.min} onChange={e => f('min')(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Descrição</label>
            <textarea rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400 resize-none" value={form.descricao} onChange={e => f('descricao')(e.target.value)} />
          </div>
          {parseFloat(form.preco) > 0 && parseFloat(form.custo) > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs">
              <p className="text-green-700 font-semibold">Margem: {Math.round(((parseFloat(form.preco) - parseFloat(form.custo)) / parseFloat(form.preco)) * 100)}%</p>
              <p className="text-green-600">Lucro por unidade: {moeda(parseFloat(form.preco) - parseFloat(form.custo))}</p>
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

export default function ProdutosPage() {
  const { data: produtos = [], isLoading } = useProdutos()
  const [busca, setBusca] = useState('')
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<Produto | undefined>()

  const filtrados = useMemo(() => {
    const q = busca.toLowerCase()
    return produtos.filter(p => p.nome.toLowerCase().includes(q) || (p.categoria as any)?.nome?.toLowerCase().includes(q))
  }, [produtos, busca])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Produtos <span className="text-gray-400 text-sm font-normal">({produtos.length})</span></h1>
        <button onClick={() => { setEditando(undefined); setModal(true) }} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
          <Plus size={15} /> Novo Produto
        </button>
      </div>
      <div className="relative mb-4">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-orange-400" placeholder="Buscar produto..." value={busca} onChange={e => setBusca(e.target.value)} />
      </div>
      {isLoading ? <div className="text-center py-12 text-gray-400">Carregando...</div> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <th className="text-left px-4 py-3">Produto</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Categoria</th>
                <th className="text-right px-4 py-3">Preço</th>
                <th className="text-right px-4 py-3 hidden md:table-cell">Custo</th>
                <th className="text-right px-4 py-3">Estoque</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">Nenhum produto cadastrado</td></tr>
              ) : filtrados.map(p => (
                <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center"><Package size={13} className="text-orange-500" /></div>
                      <div>
                        <p className="font-semibold">{p.nome}</p>
                        {p.descricao && <p className="text-xs text-gray-400 truncate max-w-48">{p.descricao}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell">{(p as any).categoria?.nome || '—'}</td>
                  <td className="px-4 py-3 text-right font-bold text-orange-600">{moeda(p.preco)}</td>
                  <td className="px-4 py-3 text-right text-xs text-gray-500 hidden md:table-cell">{moeda(p.custo)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={p.est <= p.min ? 'text-red-500 font-bold text-xs' : 'text-gray-600 text-xs'}>
                      {p.est <= p.min && '⚠ '}{p.est}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => { setEditando(p); setModal(true) }} className="text-gray-400 hover:text-orange-500 transition"><Pencil size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {modal && <ModalProduto produto={editando} onClose={() => { setModal(false); setEditando(undefined) }} />}
    </div>
  )
}
