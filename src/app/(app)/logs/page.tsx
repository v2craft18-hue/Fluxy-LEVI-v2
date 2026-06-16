'use client'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import { dataHoraBR } from '@/lib/utils'

const supabase = createClient()

export default function LogsPage() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['logs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('logs').select('*, usuario:usuarios(nome)').order('dt', { ascending: false }).limit(200)
      if (error) throw error
      return data
    },
  })

  const CORES: Record<string, string> = {
    criar: 'bg-green-100 text-green-700',
    editar: 'bg-blue-100 text-blue-700',
    cancelar: 'bg-red-100 text-red-700',
    excluir: 'bg-red-100 text-red-700',
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Logs de Auditoria</h1>
      {isLoading ? <div className="text-center py-12 text-gray-400">Carregando...</div> : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <th className="text-left px-4 py-3">Data/Hora</th>
              <th className="text-left px-4 py-3">Usuário</th>
              <th className="text-left px-4 py-3">Ação</th>
              <th className="text-left px-4 py-3">Módulo</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Detalhe</th>
            </tr></thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-400">Sem registros</td></tr>
              ) : (logs as any[]).map((l: any) => (
                <tr key={l.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-xs text-gray-400">{dataHoraBR(l.dt)}</td>
                  <td className="px-4 py-2.5 text-xs font-medium">{l.usuario?.nome || '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CORES[l.acao] || 'bg-gray-100 text-gray-600'}`}>{l.acao}</span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 capitalize">{l.modulo}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-400 hidden md:table-cell max-w-xs truncate">{l.det || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
