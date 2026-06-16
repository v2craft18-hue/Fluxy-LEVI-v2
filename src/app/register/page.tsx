'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase'
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
    const supabase = createClient()
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.senha,
        options: { data: { nome: data.admin_nome } },
      })
      if (authError) throw authError
      if (!authData.user) throw new Error('Erro ao criar usuário')

      const { error: rpcError } = await supabase.rpc('criar_empresa_com_admin', {
        p_empresa_nome:   data.empresa_nome,
        p_empresa_email:  data.empresa_email,
        p_admin_nome:     data.admin_nome,
        p_admin_user_id:  authData.user.id,
      })
      if (rpcError) throw rpcError

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
          <div className="text-5xl mb-4">🎉</div>
          <h1 className="text-xl font-bold mb-2">Conta criada!</h1>
          <p className="text-sm text-gray-500 mb-6">
            Enviamos um e-mail de confirmação. Verifique sua caixa de entrada para ativar sua conta.
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
          <div className="text-4xl mb-3">🍰</div>
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
