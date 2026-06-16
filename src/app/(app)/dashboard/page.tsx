'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import { usePedidosRealtime } from '@/hooks/usePedidos'
import { moeda, STATUS_LABELS, STATUS_CORES } from '@/lib/utils'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { ShoppingCart, DollarSign, TrendingUp, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, subDays } from 'date-fns'
import type { StatusPedido } from '@/types'

const supabase = createClient()

function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const hoje = new Date().toISOString().slice(0, 10)
      const mes = hoje.slice(0, 7)

      const [pedidos, clientes, meta] = await Promise.all([
        supabase.from('pedidos').select('id, total, status, data_pedido, numero, cliente:clientes(nome)').order('data_pedido', { ascending: false }).limit(100),
        supabase.from('clientes').select('id', { count: 'exact', head: true }),
        supabase.from('metas').select('*').eq('tipo', 'mensal').eq('categoria', 'geral').gte('periodo', mes + '-01').maybeSingle(),
      ])

      const peds = pedidos.data || []
      const ok = (p: any) => p.status !== 'cancelado'

      const fatHoje = peds.filter(p => p.data_pedido?.slice(0,10) === hoje && ok(p)).reduce((a, p) => a + (p.total || 0), 0)
      const fatMes  = peds.filter(p => p.data_pedido?.slice(0,7) === mes && ok(p)).reduce((a, p) => a + (p.total || 0), 0)
      const validos = peds.filter(ok)
      const ticket  = validos.length ? validos.reduce((a, p) => a + (p.total || 0), 0) / validos.length : 0

      // Gráfico últimos 7 dias
      const grafico = Array.from({ length: 7 }, (_, i) => {
        const d = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd')
        const fat = peds.filter(p => p.data_pedido?.slice(0,10) === d && ok(p)).reduce((a, p) => a + (p.total || 0), 0)
        return { dia: format(subDays(new Date(), 6 - i), 'dd/MM'), fat }
      })

      return {
        fatHoje, fatMes, ticket,
        totalClientes: clientes.count || 0,
        pedidosRecentes: peds.slice(0, 8),
        meta: meta.data,
        grafico,
      }
    },
  })
}

export default function DashboardPage() {
  const { data, isLoading } = useDashboard()
  usePedidosRealtime()

  if (isLoading) return <div className="text-center py-12 text-gray-400">Carregando...</div>
  if (!data) return null

  const metaPct = data.meta ? Math.min(100, Math.round((data.fatMes / data.meta.meta) * 100)) : null

  return (
    <div className="space-y-5">
      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Faturamento Hoje', value: moeda(data.fatHoje), icon: DollarSign, cor: 'border-l-orange-500' },
          { label: 'Faturamento Mês',  value: moeda(data.fatMes),  icon: TrendingUp, cor: 'border-l-green-500' },
          { label: 'Ticket Médio',     value: moeda(data.ticket),  icon: ShoppingCart, cor: 'border-l-blue-500' },
          { label: 'Clientes',         value: String(data.totalClientes), icon: Users, cor: 'border-l-purple-500' },
        ].map(m => {
          const Icon = m.icon
          return (
            <div key={m.label} className={cn('bg-white rounded-xl border border-gray-200 border-l-4 p-4', m.cor)}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">{m.label}</p>
                <Icon size={14} className="text-gray-400" />
              </div>
              <p className="text-xl font-bold">{m.value}</p>
            </div>
          )
        })}
      </div>

      {/* Meta */}
      {metaPct !== null && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold">🎯 Meta Mensal</p>
            <span className="text-sm font-bold">{metaPct}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${metaPct}%`, background: metaPct >= 100 ? '#16a34a' : metaPct >= 70 ? '#d97706' : '#e85d04' }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">{moeda(data.fatMes)} de {moeda(data.meta?.meta)}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Gráfico */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Últimos 7 dias</p>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={data.grafico}>
              <XAxis dataKey="dia" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => moeda(v)} />
              <Line type="monotone" dataKey="fat" stroke="#e85d04" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pedidos recentes */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-bold">Pedidos Recentes</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-4 py-2 text-gray-500">Nº</th>
                  <th className="text-left px-4 py-2 text-gray-500">Cliente</th>
                  <th className="text-left px-4 py-2 text-gray-500">Total</th>
                  <th className="text-left px-4 py-2 text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.pedidosRecentes.map((p: any) => {  // eslint-disable-line @typescript-eslint/no-explicit-any
                  const cores = STATUS_CORES[p.status as keyof typeof STATUS_CORES]
                  return (
                    <tr key={p.id} className="border-t border-gray-50">
                      <td className="px-4 py-2 font-bold text-orange-600">{p.numero}</td>
                      <td className="px-4 py-2">{p.cliente?.nome || '—'}</td>
                      <td className="px-4 py-2 font-bold">{moeda(p.total)}</td>
                      <td className="px-4 py-2">
                        <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-semibold', cores?.bg, cores?.text)}>
                          {STATUS_LABELS[p.status as StatusPedido]}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
