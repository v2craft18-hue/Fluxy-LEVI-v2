'use client'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import { moeda, dataBR, waLink } from '@/lib/utils'
import { MessageCircle } from 'lucide-react'

const supabase = createClient()

export default function InadimplenciaPage() {
  const { data: pendentes = [], isLoading } = useQuery({
    queryKey: ['inadimplencia'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pagamentos')
        .select('*, pedido:pedidos(numero, total, data_ent, status, cliente:clientes(nome, whats, tel))')
        .eq('status', 'pendente')
        .eq('momento', 'entrega')
        .order('criado_em', { ascending: false })
      if (error) throw error
      // Excluir pagamentos de pedidos cancelados (não são inadimplência real)
      return (data as any[]).filter(p => p.pedido && p.pedido.status !== 'cancelado')
    },
  })

  const totalInad = (pendentes as any[]).reduce((a: number, p: any) => a + (p.valor || 0), 0)

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Inadimplência</h1>
      {(pendentes as any[]).length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-bold text-red-700">{(pendentes as any[]).length} pagamento{(pendentes as any[]).length > 1 ? 's' : ''} pendente{(pendentes as any[]).length > 1 ? 's' : ''}</p>
          <p className="text-xs text-red-500 mt-0.5">Total: {moeda(totalInad)}</p>
        </div>
      )}
      {isLoading ? <div className="text-center py-12 text-gray-400">Carregando...</div> : (
        <div className="space-y-3">
          {(pendentes as any[]).length === 0 ? <div className="text-center py-12 text-green-500 text-sm font-semibold">✓ Sem inadimplências!</div> :
            (pendentes as any[]).map((p: any) => (
              <div key={p.id} className="bg-white rounded-xl border border-red-200 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold">{p.pedido?.cliente?.nome || '—'}</p>
                    <p className="text-xs text-orange-600 font-bold">{p.pedido?.numero}</p>
                  </div>
                  <p className="font-bold text-red-500 text-lg">{moeda(p.valor)}</p>
                </div>
                {p.pedido?.data_ent && <p className="text-xs text-gray-400 mb-3">Entrega: {dataBR(p.pedido.data_ent)}</p>}
                {p.pedido?.cliente?.whats && (
                  <a href={waLink(p.pedido.cliente.whats)} target="_blank" rel="noopener"
                    className="flex items-center justify-center gap-2 w-full border border-green-300 text-green-700 rounded-lg py-2 text-xs font-semibold hover:bg-green-50 transition">
                    <MessageCircle size={12} /> Cobrar via WhatsApp
                  </a>
                )}
              </div>
            ))
          }
        </div>
      )}
    </div>
  )
}
