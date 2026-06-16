'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import { moeda, dataBR } from '@/lib/utils'
import { Plus, X, TrendingDown, TrendingUp, DollarSign } from 'lucide-react'
import { useAppStore } from '@/store'
import type { Despesa } from '@/types'
import { toast } from 'sonner'

const supabase = createClient()

function useDespesas() {
  return useQuery({
    queryKey: ['despesas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('despesas').select('*').order('data_despesa', { ascending: false }).limit(200)
      if (error) throw error
      return data as Despesa[]
    },
  })
}

function useResumoFinanceiro() {
  return useQuery({
    queryKey: ['financeiro-resumo'],
    queryFn: async () => {
      const mes = new Date().toISOString().slice(0, 7)
      const [receitas, despesas, pagamentos] = await Promise.all([
        supabase.from('pedidos').select('total, status, data_pedido').eq('status', 'entregue').gte('data_pedido', mes + '-01'),
        supabase.from('despesas').select('valor, pago, data_despesa').gte('data_despesa', mes + '-01'),
        supabase.from('pagamentos').select('valor, status').eq('status', 'pendente'),
      ])
      const fatMes = (receitas.data || []).reduce((a, p) => a + (p.total || 0), 0)
      const despMes = (despesas.data || []).reduce((a, d) => a + (d.valor || 0), 0)
      const aReceber = (pagamentos.data || []).reduce((a, p) => a + (p.valor || 0), 0)
      return { fatMes, despMes, lucroMes: fatMes - despMes, aReceber }
    },
  })
}

function ModalDespesa({ despesa, onClose }: { despesa?: Despesa; onClose: () => void }) {
  const qc = useQueryClient()
  const { empresaId, usuario } = useAppStore()
  const [form, setForm] = useState({
    descricao: despesa?.descricao ?? '', cat: despesa?.cat ?? '',
    valor: String(despesa?.valor ?? ''), data_despesa: despesa?.data_despesa ?? new Date().toISOString().slice(0, 10),
    venc: despesa?.venc ?? '', pago: despesa?.pago ?? false,
  })
  const f = (k: string) => (v: any) => setForm(p => ({ ...p, [k]: v }))

  const salvar = useMutation({
    mutationFn: async () => {
      const payload = { ...form, valor: parseFloat(form.valor as string) || 0 }
      if (despesa?.id) {
        await supabase.from('despesas').update(payload).eq('id', despesa.id)
      } else {
        await supabase.from('despesas').insert({ ...payload, empresa_id: empresaId, uid: usuario?.id })
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['despesas'] }); qc.invalidateQueries({ queryKey: ['financeiro-resumo'] }); toast.success('Despesa salva!'); onClose() },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 p-0 md:p-4">
      <div className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold">{despesa ? 'Editar Despesa' : 'Nova Despesa'}</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Descrição *</label>
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={form.descricao} onChange={e => f('descricao')(e.target.value)} placeholder="Ex: Embalagens, aluguel..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Categoria</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={form.cat} onChange={e => f('cat')(e.target.value)} placeholder="Insumos, Fixo..." />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Valor (R$)</label>
              <input type="number" min={0} step={0.01} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={form.valor} onChange={e => f('valor')(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Data</label>
              <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={form.data_despesa} onChange={e => f('data_despesa')(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Vencimento</label>
              <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={form.venc} onChange={e => f('venc')(e.target.value)} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.pago} onChange={e => f('pago')(e.target.checked)} className="accent-orange-500" />
            <span>Já foi pago</span>
          </label>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={() => salvar.mutate()} disabled={salvar.isPending || !form.descricao.trim()} className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white rounded-lg py-2.5 text-sm font-semibold">
            {salvar.isPending ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function FinanceiroPage() {
  const { data: despesas = [], isLoading } = useDespesas()
  const { data: resumo } = useResumoFinanceiro()
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<Despesa | undefined>()
  const qc = useQueryClient()

  async function marcarPago(id: string, pago: boolean) {
    await supabase.from('despesas').update({ pago }).eq('id', id)
    qc.invalidateQueries({ queryKey: ['despesas'] })
    qc.invalidateQueries({ queryKey: ['financeiro-resumo'] })
  }

  const hoje = new Date().toISOString().slice(0, 10)
  const vencidas = despesas.filter(d => !d.pago && d.venc && d.venc < hoje)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Financeiro</h1>
        <button onClick={() => { setEditando(undefined); setModal(true) }} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
          <Plus size={15} /> Nova Despesa
        </button>
      </div>

      {/* Resumo */}
      {resumo && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Receita Mês', value: moeda(resumo.fatMes), icon: TrendingUp, cor: 'border-l-green-500' },
            { label: 'Despesas Mês', value: moeda(resumo.despMes), icon: TrendingDown, cor: 'border-l-red-400' },
            { label: 'Lucro Mês', value: moeda(resumo.lucroMes), icon: DollarSign, cor: resumo.lucroMes >= 0 ? 'border-l-blue-500' : 'border-l-red-600' },
            { label: 'A Receber', value: moeda(resumo.aReceber), icon: DollarSign, cor: 'border-l-amber-500' },
          ].map(m => {
            const Icon = m.icon
            return (
              <div key={m.label} className={`bg-white rounded-xl border border-gray-200 border-l-4 p-4 ${m.cor}`}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">{m.label}</p>
                  <Icon size={14} className="text-gray-400" />
                </div>
                <p className="text-xl font-bold">{m.value}</p>
              </div>
            )
          })}
        </div>
      )}

      {vencidas.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-bold text-red-700 mb-1">⚠️ {vencidas.length} despesa{vencidas.length > 1 ? 's' : ''} vencida{vencidas.length > 1 ? 's' : ''}</p>
          <p className="text-xs text-red-600">{vencidas.map(d => d.descricao).join(', ')}</p>
        </div>
      )}

      {/* Lista despesas */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold">Despesas</h3>
        </div>
        {isLoading ? <div className="text-center py-12 text-gray-400">Carregando...</div> : (
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <th className="text-left px-4 py-3">Descrição</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Categoria</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Data</th>
              <th className="text-right px-4 py-3">Valor</th>
              <th className="text-center px-4 py-3">Status</th>
            </tr></thead>
            <tbody>
              {despesas.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-400">Nenhuma despesa cadastrada</td></tr>
              ) : despesas.map(d => (
                <tr key={d.id} className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => { setEditando(d); setModal(true) }}>
                  <td className="px-4 py-3 font-medium">{d.descricao}</td>
                  <td className="px-4 py-3 text-xs text-gray-400 hidden md:table-cell">{d.cat || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-400 hidden md:table-cell">{dataBR(d.data_despesa)}</td>
                  <td className="px-4 py-3 text-right font-bold text-red-500">{moeda(d.valor)}</td>
                  <td className="px-4 py-3 text-center" onClick={e => { e.stopPropagation(); marcarPago(d.id, !d.pago) }}>
                    <button className={`text-xs font-semibold px-2 py-0.5 rounded-full ${d.pago ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {d.pago ? '✓ Pago' : '⏳ Pendente'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {modal && <ModalDespesa despesa={editando} onClose={() => { setModal(false); setEditando(undefined) }} />}
    </div>
  )
}
