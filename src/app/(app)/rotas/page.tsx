'use client'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import { MapPin } from 'lucide-react'

const supabase = createClient()
const DIAS: Record<string, string> = { seg:'Segunda',ter:'Terça',qua:'Quarta',qui:'Quinta',sex:'Sexta',sab:'Sábado',dom:'Domingo' }

export default function RotasPage() {
  const { data: rotas = [], isLoading } = useQuery({
    queryKey: ['rotas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('rotas').select('*, clientes:rota_clientes(cliente:clientes(id,nome,rua,num,bairro))').eq('ativo', true).order('nome')
      if (error) throw error
      return data
    },
  })

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Disponibilidade / Rotas</h1>
      {isLoading ? <div className="text-center py-12 text-gray-400">Carregando...</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(rotas as any[]).length === 0 ? <div className="text-center py-12 text-gray-400 col-span-full">Nenhuma rota cadastrada</div> :
            (rotas as any[]).map((r: any) => (
              <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin size={14} className="text-orange-500" />
                  <p className="font-semibold">{r.nome}</p>
                  {r.dia && <span className="text-xs bg-orange-100 text-orange-700 font-semibold px-2 py-0.5 rounded-full">{DIAS[r.dia] || r.dia}</span>}
                </div>
                {r.clientes?.length > 0 ? (
                  <ul className="space-y-1.5">
                    {r.clientes.map((rc: any, i: number) => rc.cliente && (
                      <li key={rc.cliente.id} className="flex items-start gap-2 text-xs text-gray-600">
                        <span className="text-gray-300 font-bold w-5 text-right shrink-0">{i+1}.</span>
                        <div>
                          <p className="font-semibold">{rc.cliente.nome}</p>
                          {rc.cliente.rua && <p className="text-gray-400">{rc.cliente.rua}, {rc.cliente.num} — {rc.cliente.bairro}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-xs text-gray-400">Sem clientes nesta rota</p>}
              </div>
            ))
          }
        </div>
      )}
    </div>
  )
}
