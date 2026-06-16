'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import { moeda } from '@/lib/utils'
import { useAppStore } from '@/store'
import { Plus, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

const supabase = createClient()

export default function MetasPage() {
  const qc = useQueryClient()
  const { empresaId } = useAppStore()
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ tipo: 'mensal', categoria: 'geral', meta: '', periodo: new Date().toISOString().slice(0, 7) + '-01', unidade: 'R$', ref_nome: '' })
  const f = (k: string) => (v: any) => setForm(p => ({ ...p, [k]: v }))

  const { data: metas = [], isLoading } = useQuery({
    queryKey: ['metas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('metas').select('*').order('periodo', { ascending: false }).limit(50)
      if (error) throw error
      return data
    },
  })

  const { data: resumo } = useQuery({
    queryKey: ['metas-resumo'],
    queryFn: async () => {
      const mes = new Date().toISOString().slice(0, 7)
      const { data } = await supabase.from('pedidos').select('total, status').eq('status', 'entregue').gte('data_pedido', mes + '-01')
      return (data || []).reduce((a: number, p: any) => a + (p.total || 0), 0)
    },
  })

  const salvar = useMutation({
    mutationFn: async () => {
      const payload = { ...form, meta: parseFloat(form.meta as string) || 0 }
      await supabase.from('metas').insert({ ...payload, empresa_id: empresaId })
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['metas'] }); toast.success('Meta criada!'); setModal(false) },
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Metas</h1>
        <button onClick={() => setModal(true)} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"><Plus size={15} /> Nova Meta</button>
      </div>
      {isLoading ? <div className="text-center py-12 text-gray-400">Carregando...</div> : (
        <div className="space-y-3">
          {(metas as any[]).length === 0 ? <div className="text-center py-12 text-gray-400">Nenhuma meta cadastrada</div> : (metas as any[]).map((m: any) => {
            const atingido = m.categoria === 'geral' && m.tipo === 'mensal' ? (resumo || 0) : m.atingido
            const pct = m.meta > 0 ? Math.min(100, Math.round((atingido / m.meta) * 100)) : 0
            return (
              <div key={m.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold text-sm">{m.ref_nome || `Meta ${m.categoria} ${m.tipo}`}</p>
                    <p className="text-xs text-gray-400">{m.periodo?.slice(0, 7)} · {m.unidade}</p>
                  </div>
                  <span className="text-lg font-bold">{pct}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct >= 100 ? '#16a34a' : pct >= 70 ? '#d97706' : '#e85d04' }} />
                </div>
                <p className="text-xs text-gray-500">{m.unidade === 'R$' ? moeda(atingido) : atingido} de {m.unidade === 'R$' ? moeda(m.meta) : m.meta}</p>
              </div>
            )
          })}
        </div>
      )}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 p-0 md:p-4">
          <div className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100"><h2 className="font-bold">Nova Meta</h2><button onClick={() => setModal(false)}><X size={18} className="text-gray-400" /></button></div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Nome da Meta</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={form.ref_nome} onChange={e => f('ref_nome')(e.target.value)} placeholder="Ex: Faturamento Mensal" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Tipo</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={form.tipo} onChange={e => f('tipo')(e.target.value)}>
                    <option value="mensal">Mensal</option>
                    <option value="semanal">Semanal</option>
                    <option value="diaria">Diária</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Valor da Meta</label>
                  <input type="number" min={0} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={form.meta} onChange={e => f('meta')(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Período (mês)</label>
                  <input type="month" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={form.periodo.slice(0,7)} onChange={e => f('periodo')(e.target.value + '-01')} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Unidade</label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={form.unidade} onChange={e => f('unidade')(e.target.value)}>
                    <option value="R$">R$ (Faturamento)</option>
                    <option value="pedidos">Pedidos</option>
                    <option value="clientes">Clientes</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
              <button onClick={() => setModal(false)} className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={() => salvar.mutate()} disabled={salvar.isPending} className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white rounded-lg py-2.5 text-sm font-semibold">Criar Meta</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
