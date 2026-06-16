// ================================================================
// FLUXY — Layout Autenticado
// ================================================================

import { createServerSupabase } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { StoreHydrator } from '@/components/StoreHydrator'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Buscar perfil do usuário
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!usuario || !usuario.ativo) redirect('/login')

  // Buscar empresa pelo empresa_id do usuário (filtro obrigatório para multi-tenant)
  const { data: empresa } = usuario.empresa_id
    ? await supabase
        .from('empresas')
        .select('*')
        .eq('id', usuario.empresa_id)
        .single()
    : { data: null }

  return (
    <div className="flex min-h-screen bg-[#f5f4f1]">
      <StoreHydrator usuario={usuario as any} empresa={empresa} />
      <Sidebar usuario={usuario} empresa={empresa} />
      <div className="flex-1 flex flex-col md:ml-56">
        <Header usuario={usuario} empresa={empresa} />
        <main className="flex-1 p-4 md:p-5 mt-14">
          {children}
        </main>
      </div>
    </div>
  )
}
