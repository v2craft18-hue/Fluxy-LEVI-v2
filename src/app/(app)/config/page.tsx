'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Save, Printer } from 'lucide-react'
import { useAppStore } from '@/store'

const supabase = createClient()

export default function ConfigPage() {
  const qc = useQueryClient()
  const { formatoImpressao, setFormatoImpressao } = useAppStore()
  const { data: empresa, isLoading } = useQuery({
    queryKey: ['empresa-config'],
    queryFn: async () => {
      const { data } = await supabase.from('empresas').select('*').single()
      return data
    },
  })

  const [form, setForm] = useState<any>({})
  useEffect(() => { if (empresa) setForm(empresa) }, [empresa])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const f = (k: string) => (v: string) => setForm((p: any) => ({ ...p, [k]: v }))

  const salvar = useMutation({
    mutationFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, criado_em: _c, atualizado_em: _a, slug: _s, plano: _p, trial_ate: _t, ativo: _v, ...rest } = form
      await supabase.from('empresas').update(rest).eq('id', id)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['empresa-config'] }); toast.success('Configurações salvas!') },
    onError: (e: Error) => toast.error(e.message),
  })

  if (isLoading) return <div className="text-center py-12 text-gray-400">Carregando...</div>

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Configurações</h1>
        <button onClick={() => salvar.mutate()} disabled={salvar.isPending} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
          <Save size={14} /> {salvar.isPending ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Dados da Empresa</p>
        <div className="grid grid-cols-2 gap-4">
          {[
            { k: 'nome', l: 'Nome Fantasia', col: 2 },
            { k: 'razao', l: 'Razão Social', col: 2 },
            { k: 'cnpj', l: 'CNPJ', col: 1 },
            { k: 'email', l: 'E-mail', col: 1 },
            { k: 'tel', l: 'Telefone', col: 1 },
            { k: 'whats', l: 'WhatsApp', col: 1 },
            { k: 'rua', l: 'Rua', col: 2 },
            { k: 'num', l: 'Número', col: 1 },
            { k: 'bairro', l: 'Bairro', col: 1 },
            { k: 'cidade', l: 'Cidade', col: 1 },
            { k: 'estado', l: 'UF', col: 1 },
          ].map(({ k, l, col }) => (
            <div key={k} className={col === 2 ? 'col-span-2' : ''}>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">{l}</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" value={form[k] ?? ''} onChange={e => f(k)(e.target.value)} />
            </div>
          ))}
        </div>
      </div>

      {/* Formato de Impressão */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Printer size={14} className="text-gray-400" />
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Formato de Impressão de Pedidos</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {([
            { v: 'a4' as const, l: 'A4 / PDF', d: 'Folha A4 completa, ideal para impressoras comuns e PDF.' },
            { v: 'termica' as const, l: 'Térmica 80mm', d: 'Bobina 80mm, para impressoras de cupom.' },
          ]).map(opt => {
            const ativo = formatoImpressao === opt.v
            return (
              <button
                key={opt.v}
                onClick={() => { setFormatoImpressao(opt.v); toast.success(`Formato definido: ${opt.l}`) }}
                className={'text-left border-2 rounded-xl p-4 transition ' + (ativo ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-orange-200')}
              >
                <p className={'font-bold text-sm ' + (ativo ? 'text-orange-700' : 'text-gray-700')}>{opt.l}</p>
                <p className="text-xs text-gray-500 mt-1">{opt.d}</p>
              </button>
            )
          })}
        </div>
        <p className="text-[11px] text-gray-400">Esta preferência fica salva neste dispositivo.</p>
      </div>

      {empresa && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 text-xs text-gray-400 space-y-1">
          <p><span className="font-semibold">Plano:</span> {empresa.plano}</p>
          <p><span className="font-semibold">Slug:</span> {empresa.slug}</p>
        </div>
      )}
    </div>
  )
}
