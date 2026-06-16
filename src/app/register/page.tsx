'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'

const schema = z.object({
  empresa_nome:  z.string().min(2, 'Nome da empresa obrigatório'),
  empresa_email: z.string().email('E-mail inválido'),
  admin_nome:    z.string().min(2, 'Seu nome é obrigatório'),
  email:         z.string().email('E-mail inválido'),
  senha:         z.string().min(8, 'Mínimo 8 caracteres'),
  confirmar:     z.string(),
}).refine(d => d.senha === d.confirmar, {
  message: 'Senhas não conferem', path: ['confirmar']
})

type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'form' | 'confirmacao'>('form')

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      // Usa a API server-side com service_role para criar o usuário
      // com email_confirm: true — sem necessidade de confirmação por e-mail.
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresa_nome:  data.empresa_nome,
          empresa_email: data.empresa_email,
          admin_nome:    data.admin_nome,
          email:         data.email,
          senha:         data.senha,
        }),
      })

      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Erro ao criar conta.')
      }

      setStep('confirmacao')
    } catch (e: unknown) {
      toast.error((e as Error).message || 'Erro ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'confirmacao') {
    return (
      <div className="min-h-screen bg-[#f5f4f1] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 w-full max-w-sm p-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-orange-500 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
            F
          </div>
          <h1 className="text-xl font-bold mb-2">Conta criada!</h1>
          <p className="text-sm text-gray-500 mb-6">
            Sua empresa foi configurada com sucesso. Você já pode fazer login com seu e-mail e senha.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg py-3 text-sm transition"
          >
            Ir para o Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f4f1] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 w-full max-w-md p-10">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3">
            F
          </div>
          <h1 className="text-xl font-bold">Criar conta no Fluxy</h1>
          <p className="text-sm text-gray-500 mt-1">14 dias grátis, sem cartão de crédito</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Sua empresa</p>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Nome da Empresa *</label>
              <input type="text" placeholder="Doceria da Maria" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500" {...register('empresa_nome')} />
              {errors.empresa_nome && <p className="text-red-500 text-xs mt-1">{errors.empresa_nome.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">E-mail da Empresa *</label>
              <input type="email" placeholder="contato@empresa.com" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500" {...register('empresa_email')} />
              {errors.empresa_email && <p className="text-red-500 text-xs mt-1">{errors.empresa_email.message}</p>}
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Administrador</p>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Seu Nome *</label>
              <input type="text" placeholder="Maria Silva" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500" {...register('admin_nome')} />
              {errors.admin_nome && <p className="text-red-500 text-xs mt-1">{errors.admin_nome.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Seu E-mail *</label>
              <input type="email" placeholder="maria@empresa.com" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500" {...register('email')} />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Senha *</label>
              <input type="password" placeholder="Mínimo 8 caracteres" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500" {...register('senha')} />
              {errors.senha && <p className="text-red-500 text-xs mt-1">{errors.senha.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Confirmar Senha *</label>
              <input type="password" placeholder="Repita a senha" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500" {...register('confirmar')} />
              {errors.confirmar && <p className="text-red-500 text-xs mt-1">{errors.confirmar.message}</p>}
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg py-3 text-sm transition disabled:opacity-60">
            {loading ? 'Criando sua conta...' : 'Começar 14 dias grátis'}
          </button>

          <p className="text-center text-xs text-gray-500">
            Já tem conta?{' '}
            <a href="/login" className="text-orange-500 font-semibold hover:underline">Fazer login</a>
          </p>
        </form>
      </div>
    </div>
  )
}
