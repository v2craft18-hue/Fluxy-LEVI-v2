'use client'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import { moeda } from '@/lib/utils'
import { Package, AlertTriangle } from 'lucide-react'

const supabase = createClient()

export default function EstoquePage() {
  const { data: produtos = [], isLoading } = useQuery({
    queryKey: ['estoque'],
    queryFn: async () => {
      const { data, error } = await supabase.from('produtos').select('*, categoria:categorias(nome)').eq('ativo', true).order('nome')
      if (error) throw error
      return data
    },
  })

  const abaixoMin = produtos.filter((p: any) => p.est <= p.min)

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Estoque</h1>
      {abaixoMin.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-bold text-red-700">{abaixoMin.length} produto{abaixoMin.length > 1 ? 's' : ''} abaixo do mínimo</p>
            <p className="text-xs text-red-600 mt-0.5">{(abaixoMin as any[]).map(p => p.nome).join(', ')}</p>
          </div>
        </div>
      )}
      {isLoading ? <div className="text-center py-12 text-gray-400">Carregando...</div> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <th className="text-left px-4 py-3">Produto</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Categoria</th>
              <th className="text-right px-4 py-3">Estoque</th>
              <th className="text-right px-4 py-3">Mínimo</th>
              <th className="text-right px-4 py-3 hidden md:table-cell">Custo Unit</th>
              <th className="text-right px-4 py-3 hidden md:table-cell">Valor Total</th>
            </tr></thead>
            <tbody>
              {(produtos as any[]).map((p: any) => {
                const baixo = p.est <= p.min
                return (
                  <tr key={p.id} className={`border-t border-gray-100 ${baixo ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Package size={13} className={baixo ? 'text-red-400' : 'text-gray-300'} />
                        <span className="font-medium">{p.nome}</span>
                        {baixo && <span className="text-[10px] bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded-full">BAIXO</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 hidden md:table-cell">{p.categoria?.nome || '—'}</td>
                    <td className={`px-4 py-3 text-right font-bold ${baixo ? 'text-red-500' : ''}`}>{p.est}</td>
                    <td className="px-4 py-3 text-right text-xs text-gray-400">{p.min}</td>
                    <td className="px-4 py-3 text-right text-xs text-gray-500 hidden md:table-cell">{moeda(p.custo)}</td>
                    <td className="px-4 py-3 text-right text-xs font-semibold hidden md:table-cell">{moeda(p.est * p.custo)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
