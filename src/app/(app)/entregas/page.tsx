'use client'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import { moeda, dataBR, STATUS_LABELS, STATUS_CORES } from '@/lib/utils'
import { useAvancarStatus, usePedidosRealtime } from '@/hooks/usePedidos'
import { cn } from '@/lib/utils'
import { NEXT_STATUS } from '@/lib/utils'
import { useAppStore } from '@/store'

const supabase = createClient()

export default function EntregasPage() {
  const usuario = useAppStore(s => s.usuario)
  // Entregador vê apenas as próprias entregas; admin vê todas.
  const filtroEnt = usuario?.perfil === 'entregador' ? usuario.ent_id ?? null : null

  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ['entregas', filtroEnt],
    queryFn: async () => {
      let q = supabase
        .from('pedidos')
        .select('id, numero, status, total, data_ent, hora_ent, obs, ent_id, cliente:clientes(nome, rua, num, bairro, cidade, tel, whats)')
        .in('status', ['pronto_entrega', 'entregue'])
        .order('data_ent', { ascending: true })
      if (filtroEnt) q = q.eq('ent_id', filtroEnt)
      const { data, error } = await q
      if (error) throw error
      return data
    },
  })
  const avancar = useAvancarStatus()
  usePedidosRealtime()

  const hoje_ = new Date().toISOString().slice(0, 10)
  const pendentes = (pedidos as any[]).filter(p => p.status === 'pronto_entrega')
  const entregues = (pedidos as any[]).filter(p => p.status === 'entregue' && p.data_ent === hoje_)

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Minhas Entregas</h1>
      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="bg-white rounded-xl border border-gray-200 p-4"><p className="text-2xl font-bold text-orange-500">{pendentes.length}</p><p className="text-xs text-gray-500 mt-1">Para Entregar</p></div>
        <div className="bg-white rounded-xl border border-gray-200 p-4"><p className="text-2xl font-bold text-green-500">{entregues.length}</p><p className="text-xs text-gray-500 mt-1">Entregues Hoje</p></div>
      </div>
      {isLoading ? <div className="text-center py-12 text-gray-400">Carregando...</div> : (
        <div className="space-y-3">
          {pedidos.length === 0 && <div className="text-center py-12 text-gray-400">Nenhuma entrega no momento</div>}
          {(pedidos as any[]).map((p: any) => {
            const cores = STATUS_CORES[p.status as keyof typeof STATUS_CORES]
            const prox = NEXT_STATUS[p.status as keyof typeof NEXT_STATUS]
            return (
              <div key={p.id} className={cn('bg-white rounded-xl border p-4 space-y-3', p.status === 'entregue' ? 'border-green-200 opacity-70' : 'border-gray-200')}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-orange-600 text-sm">{p.numero}</p>
                    <p className="font-semibold">{p.cliente?.nome}</p>
                    {p.cliente?.rua && <p className="text-xs text-gray-400 mt-0.5">{p.cliente.rua}, {p.cliente.num} — {p.cliente.bairro}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{moeda(p.total)}</p>
                    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', cores?.bg, cores?.text)}>{STATUS_LABELS[p.status as keyof typeof STATUS_LABELS]}</span>
                  </div>
                </div>
                {p.data_ent && <p className="text-xs text-gray-500">📅 Entrega: {dataBR(p.data_ent)} {p.hora_ent || ''}</p>}
                {p.obs && <p className="text-xs bg-amber-50 text-amber-700 rounded p-2">📝 {p.obs}</p>}
                <div className="flex gap-2">
                  {p.cliente?.whats && <a href={`https://wa.me/55${p.cliente.whats.replace(/\D/g,'')}`} target="_blank" rel="noopener" className="flex-1 text-center border border-green-300 text-green-700 rounded-lg py-2 text-xs font-semibold hover:bg-green-50">📱 WhatsApp</a>}
                  {prox && p.status !== 'entregue' && (
                    <button onClick={() => avancar.mutate({ id: p.id, status_atual: p.status, proximo: prox as any })} disabled={avancar.isPending} className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white rounded-lg py-2 text-xs font-bold transition">
                      ✓ Confirmar Entrega
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
