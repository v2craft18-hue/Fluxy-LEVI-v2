'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(6, 'Senha muito curta'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    const supabase = createClient()

    const email = data.email.trim().toLowerCase()
    const password = data.senha

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('[Fluxy] Erro signInWithPassword:', {
        message: error.message,
        status: error.status,
        code: error.code,
      })

      if (
        error.message.includes('Invalid login credentials') ||
        error.message.includes('invalid_credentials') ||
        error.code === 'invalid_credentials'
      ) {
        toast.error('E-mail ou senha incorretos. Verifique os dados e tente novamente.')
      } else if (
        error.message.includes('Email not confirmed') ||
        error.code === 'email_not_confirmed'
      ) {
        toast.error('E-mail não confirmado. Peça ao administrador para reativar seu acesso.')
      } else {
        toast.error(error.message || 'Erro ao fazer login. Tente novamente.')
      }
      setLoading(false)
      return
    }

    // Sessão criada com sucesso — navegar via window.location para garantir
    // que o cookie de sessão seja lido pelo middleware antes do carregamento.
    if (authData.session) {
      window.location.href = '/dashboard'
    } else {
      // Fallback: sessão não retornada (improvável com signInWithPassword)
      toast.error('Sessão não iniciada. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f4f1] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 w-full max-w-sm p-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-orange-500 flex items-center justify-center text-white text-2xl font-bold mb-4">
            F
          </div>
          <h1 className="text-xl font-bold text-gray-900">Sistema de Gestão</h1>
          <p className="text-sm text-gray-500 mt-1">Pedidos &amp; Entregas</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              E-mail
            </label>
            <input
              type="email"
              placeholder="seu@email.com"
              autoComplete="email"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500 transition"
              {...register('email')}
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Senha
            </label>
            <input
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500 transition"
              {...register('senha')}
            />
            {errors.senha && <p className="text-red-500 text-xs mt-1">{errors.senha.message}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg py-3 text-sm transition disabled:opacity-60"
          >
            {loading ? 'Entrando...' : 'Entrar no Sistema'}
          </button>

          <p className="text-center text-xs text-gray-500">
            Não tem conta?{' '}
            <a href="/register" className="text-orange-500 font-semibold hover:underline">Criar conta</a>
          </p>
        </form>
      </div>
    </div>
  )
}
