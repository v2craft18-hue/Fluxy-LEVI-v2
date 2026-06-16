'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import { moeda, dataBR } from '@/lib/utils'
import { toast } from 'sonner'

const supabase = createClient()

export default function ComissoesPage() {
  const qc = useQueryClient()
  const { data: comissoes = [], isLoading } = useQuery({
    queryKey: ['comissoes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comissoes')
        .select('*, vendedor:vendedores(nome), pedido:pedidos(numero, total, data_pedido)')
        .order('criado_em', { ascending: false })
      if (error) throw error
      return data
    },
  })

  const pagar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('comissoes').update({ status: 'pago', data_pag: new Date().toISOString() }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['comissoes'] }); toast.success('Comissão marcada como paga!') },
  })

  const pendentes = (comissoes as any[]).filter(c => c.status === 'pendente')
  const totalPendente = pendentes.reduce((a: number, c: any) => a + (c.valor || 0), 0)

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Comissões</h1>
      {pendentes.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-bold text-amber-700">{pendentes.length} comissão{pendentes.length > 1 ? 'ões' : ''} pendente{pendentes.length > 1 ? 's' : ''} — {moeda(totalPendente)}</p>
        </div>
      )}
      {isLoading ? <div className="text-center py-12 text-gray-400">Carregando...</div> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <th className="text-left px-4 py-3">Vendedor</th>
              <th className="text-left px-4 py-3">Pedido</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Data</th>
              <th className="text-right px-4 py-3">Valor</th>
              <th className="text-center px-4 py-3">Status</th>
            </tr></thead>
            <tbody>
              {comissoes.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-400">Nenhuma comissão gerada</td></tr>
              ) : (comissoes as any[]).map((c: any) => (
                <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{c.vendedor?.nome || '—'}</td>
                  <td className="px-4 py-3 text-xs text-orange-600 font-bold">{c.pedido?.numero || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-400 hidden md:table-cell">{dataBR(c.pedido?.data_pedido)}</td>
                  <td className="px-4 py-3 text-right font-bold">{moeda(c.valor)}</td>
                  <td className="px-4 py-3 text-center">
                    {c.status === 'pago' ? (
                      <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">✓ Pago</span>
                    ) : (
                      <button onClick={() => pagar.mutate(c.id)} disabled={pagar.isPending} className="text-xs bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full hover:bg-amber-200 transition">
                        ⏳ Pagar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
