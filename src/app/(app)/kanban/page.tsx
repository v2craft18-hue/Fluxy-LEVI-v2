'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import { useAvancarStatus, usePedidosRealtime } from '@/hooks/usePedidos'
import { useAppStore } from '@/store'
import { moeda, dataBR, NEXT_STATUS } from '@/lib/utils'
import type { Pedido, StatusPedido } from '@/types'
import { toast } from 'sonner'

const supabase = createClient()

const COLUNAS: { st: StatusPedido; lbl: string; bg: string; tc: string }[] = [
  { st: 'recebido',          lbl: 'Recebido',          bg: '#dbeafe', tc: '#1d4ed8' },
  { st: 'em_producao',       lbl: 'Em Produção',        bg: '#ffedd5', tc: '#c2410c' },
  { st: 'pronto_embalagem',  lbl: 'Pronto Embalagem',   bg: '#fef9c3', tc: '#a16207' },
  { st: 'embalado',          lbl: 'Embalado',           bg: '#f0fdf4', tc: '#15803d' },
  { st: 'pronto_entrega',    lbl: 'Pronto Entrega',     bg: '#f3e8ff', tc: '#7c3aed' },
  { st: 'entregue',          lbl: 'Entregue',           bg: '#dcfce7', tc: '#15803d' },
]

const emAndamento: StatusPedido[] = ['em_producao','pronto_embalagem','embalado','pronto_entrega']

function useKanban() {
  return useQuery({
    queryKey: ['kanban'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pedidos')
        .select('id, numero, status, total, data_ent, hora_ent, kanban_arq, cliente:clientes(nome)')
        .not('status', 'in', '(cancelado)')
        .order('data_pedido', { ascending: true })
      if (error) throw error
      return data as unknown as Pedido[]
    },
    select: (data) => {
      const hoje = new Date().toISOString().slice(0, 10)
      return COLUNAS.map(col => {
        let cards: Pedido[]
        if (col.st === 'recebido') {
          cards = data.filter(p => p.status === 'recebido' && p.data_ent === hoje && !p.kanban_arq)
        } else if (emAndamento.includes(col.st)) {
          cards = data.filter(p => p.status === col.st && !p.kanban_arq)
        } else if (col.st === 'entregue') {
          cards = data.filter(p => p.status === 'entregue' && p.data_ent === hoje && !p.kanban_arq)
        } else {
          cards = []
        }
        return { ...col, cards }
      })
    },
  })
}

export default function KanbanPage() {
  const { data: colunas = [], isLoading } = useKanban()
  const avancar = useAvancarStatus()
  const { usuario, empresaId } = useAppStore()
  const qc = useQueryClient()

  // Realtime
  usePedidosRealtime()

  async function arquivar(id: string) {
    await supabase.from('pedidos').update({ kanban_arq: true }).eq('id', id)
    await supabase.from('logs').insert({ empresa_id: empresaId, uid: usuario?.id, acao: 'editar', modulo: 'kanban', rid: id, det: 'Arquivado do Kanban' })
    qc.invalidateQueries({ queryKey: ['kanban'] })
    toast.success('Removido do Kanban')
  }

  if (isLoading) return <div className="text-center py-12 text-gray-400">Carregando Kanban...</div>

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Produção — Kanban</h1>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {colunas.map(col => (
          <div key={col.st} className="flex-shrink-0 w-48">
            <div
              className="px-3 py-2 rounded-t-lg text-xs font-bold flex items-center justify-between"
              style={{ background: col.bg, color: col.tc }}
            >
              <span>{col.lbl}</span>
              <span className="bg-white/50 rounded-full px-1.5">{col.cards.length}</span>
            </div>
            <div className="min-h-44 p-1.5 border border-t-0 border-gray-200 rounded-b-lg bg-gray-50 flex flex-col gap-1.5">
              {col.cards.length === 0
                ? <p className="text-xs text-gray-400 text-center py-6">Vazio</p>
                : col.cards.map(p => (
                  <div
                    key={p.id}
                    className="bg-white rounded-lg p-2.5 border border-gray-200 text-xs cursor-pointer hover:border-orange-400 transition"
                  >
                    <div className="font-bold text-orange-600 text-[10px]">{p.numero}</div>
                    <div className="font-semibold mt-0.5">{(p as any).cliente?.nome || '—'}</div>
                    <div className="text-green-600 font-bold mt-0.5">{moeda(p.total)}</div>
                    <div className="text-gray-400 text-[10px] mt-0.5">
                      {p.data_ent ? dataBR(p.data_ent) : '—'} {p.hora_ent || ''}
                    </div>
                    {col.st !== 'entregue' ? (
                      <button
                        onClick={() => {
                          const prox = NEXT_STATUS[col.st]
                          if (prox) avancar.mutate({ id: p.id, status_atual: col.st, proximo: prox })
                        }}
                        className="mt-2 w-full bg-orange-500 hover:bg-orange-600 text-white rounded text-[10px] py-1 font-semibold transition"
                      >
                        Avançar ▶
                      </button>
                    ) : (
                      <button
                        onClick={() => arquivar(p.id)}
                        className="mt-2 w-full bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-[10px] py-1 font-semibold transition"
                      >
                        ✓ Arquivar
                      </button>
                    )}
                  </div>
                ))
              }
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
