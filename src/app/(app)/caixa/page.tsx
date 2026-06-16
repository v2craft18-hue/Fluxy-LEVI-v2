'use client'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import { moeda, dataHoraBR } from '@/lib/utils'
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react'

const supabase = createClient()

export default function CaixaPage() {
  const { data: movs = [], isLoading } = useQuery({
    queryKey: ['caixa'],
    queryFn: async () => {
      const { data, error } = await supabase.from('caixa').select('*').order('dt', { ascending: false }).limit(100)
      if (error) throw error
      return data
    },
  })

  const ultimo = (movs as any[])[0]
  const saldoAtual = ultimo?.saldo ?? 0
  const hoje = new Date().toISOString().slice(0, 10)
  const entradasHoje = (movs as any[]).filter(m => m.dt?.slice(0,10) === hoje && ['recebimento','suprimento'].includes(m.tipo)).reduce((a: number, m: any) => a + m.valor, 0)
  const saidasHoje = (movs as any[]).filter(m => m.dt?.slice(0,10) === hoje && ['sangria','pagamento'].includes(m.tipo)).reduce((a: number, m: any) => a + m.valor, 0)

  const CORES: Record<string, string> = { recebimento: 'text-green-600', suprimento: 'text-green-500', sangria: 'text-red-500', pagamento: 'text-red-500', abertura: 'text-blue-500', fechamento: 'text-gray-500' }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Caixa</h1>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4 col-span-3 md:col-span-1">
          <div className="flex items-center gap-2 mb-1"><DollarSign size={14} className="text-gray-400" /><p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Saldo Atual</p></div>
          <p className={`text-2xl font-bold ${saldoAtual >= 0 ? 'text-green-600' : 'text-red-500'}`}>{moeda(saldoAtual)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1"><TrendingUp size={14} className="text-green-400" /><p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Entradas Hoje</p></div>
          <p className="text-xl font-bold text-green-600">{moeda(entradasHoje)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1"><TrendingDown size={14} className="text-red-400" /><p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Saídas Hoje</p></div>
          <p className="text-xl font-bold text-red-500">{moeda(saidasHoje)}</p>
        </div>
      </div>
      {isLoading ? <div className="text-center py-12 text-gray-400">Carregando...</div> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <th className="text-left px-4 py-3">Data</th>
              <th className="text-left px-4 py-3">Tipo</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Descrição</th>
              <th className="text-right px-4 py-3">Valor</th>
              <th className="text-right px-4 py-3">Saldo</th>
            </tr></thead>
            <tbody>
              {(movs as any[]).length === 0 ? <tr><td colSpan={5} className="text-center py-12 text-gray-400">Sem movimentos</td></tr> : (movs as any[]).map((m: any) => (
                <tr key={m.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-xs text-gray-400">{dataHoraBR(m.dt)}</td>
                  <td className="px-4 py-2.5 text-xs font-semibold capitalize">{m.tipo}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-400 hidden md:table-cell">{m.obs || '—'}</td>
                  <td className={`px-4 py-2.5 text-right font-bold text-xs ${CORES[m.tipo] || ''}`}>{moeda(m.valor)}</td>
                  <td className="px-4 py-2.5 text-right text-xs font-semibold">{moeda(m.saldo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
