'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { Usuario, Empresa } from '@/types'
import {
  LayoutDashboard, ShoppingCart, Factory, Users, Package,
  Warehouse, DollarSign, Wallet, Truck, MapPin, UserCheck,
  UserCog, Target, TrendingUp, AlertTriangle, ClipboardList,
  Settings, LogOut, Menu, X, UsersRound
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type NavItem = {
  href: string
  label: string
  icon: React.ElementType
  perfis: ('admin' | 'vendedor' | 'entregador')[]
}

const NAV: NavItem[] = [
  { href: '/dashboard',      label: 'Dashboard',      icon: LayoutDashboard, perfis: ['admin'] },
  { href: '/pedidos',        label: 'Pedidos',         icon: ShoppingCart,    perfis: ['admin','vendedor'] },
  { href: '/kanban',         label: 'Produção',        icon: Factory,         perfis: ['admin'] },
  { href: '/entregas',       label: 'Entregas',        icon: Truck,           perfis: ['entregador'] },
  { href: '/clientes',       label: 'Clientes',        icon: Users,           perfis: ['admin','vendedor'] },
  { href: '/produtos',       label: 'Produtos',        icon: Package,         perfis: ['admin'] },
  { href: '/estoque',        label: 'Estoque',         icon: Warehouse,       perfis: ['admin','vendedor'] },
  { href: '/vendedores',     label: 'Vendedores',      icon: UserCheck,       perfis: ['admin'] },
  { href: '/entregadores',   label: 'Entregadores',    icon: UserCog,         perfis: ['admin'] },
  { href: '/rotas',          label: 'Disponibilidade', icon: MapPin,          perfis: ['admin','vendedor'] },
  { href: '/financeiro',     label: 'Financeiro',      icon: DollarSign,      perfis: ['admin'] },
  { href: '/caixa',          label: 'Caixa',           icon: Wallet,          perfis: ['admin'] },
  { href: '/inadimplencia',  label: 'Inadimplência',   icon: AlertTriangle,   perfis: ['admin'] },
  { href: '/comissoes',      label: 'Comissões',       icon: TrendingUp,      perfis: ['admin'] },
  { href: '/metas',          label: 'Metas',           icon: Target,          perfis: ['admin','vendedor','entregador'] },
  { href: '/usuarios',       label: 'Usuários',        icon: UsersRound,      perfis: ['admin'] },
  { href: '/logs',           label: 'Logs',            icon: ClipboardList,   perfis: ['admin'] },
  { href: '/config',         label: 'Configurações',   icon: Settings,        perfis: ['admin'] },
]

interface Props {
  usuario: Usuario
  empresa: Empresa | null
}

export function Sidebar({ usuario, empresa }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const itens = NAV.filter(n => n.perfis.includes(usuario.perfil))
  const inicial = usuario.nome.charAt(0).toUpperCase()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          {empresa?.logo
            ? <Image src={empresa.logo} alt="logo" width={32} height={32} className="w-8 h-8 rounded-lg object-cover" />
            : <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white text-sm font-bold">{inicial}</div>
          }
          <div>
            <p className="text-white text-xs font-semibold leading-tight">{empresa?.nome || 'Fluxy'}</p>
            <p className="text-white/40 text-[10px]">{empresa?.cidade || 'Sistema de Gestão'}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {itens.map(item => {
          const active = pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all',
                active
                  ? 'bg-orange-500 text-white'
                  : 'text-white/60 hover:bg-white/7 hover:text-white'
              )}
            >
              <Icon size={15} className="shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Usuário */}
      <div className="p-3 border-t border-white/7">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <Link href="/perfil" onClick={() => setOpen(false)} className="flex items-center gap-2.5 flex-1 min-w-0 hover:opacity-80 transition">
            {usuario.avatar_url
              ? <Image src={usuario.avatar_url} alt={usuario.nome} width={28} height={28} className="w-7 h-7 rounded-lg object-cover shrink-0" />
              : <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center text-white text-xs font-bold shrink-0">{inicial}</div>
            }
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">{usuario.nome}</p>
              <p className="text-white/40 text-[10px] capitalize">{usuario.perfil}</p>
            </div>
          </Link>
          <button onClick={handleLogout} className="text-white/40 hover:text-white transition p-1 rounded" title="Sair">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop */}
      <aside className="hidden md:flex w-56 bg-[#1a1714] fixed top-0 left-0 bottom-0 z-50 flex-col">
        {sidebarContent}
      </aside>

      {/* Mobile: botão hambúrguer */}
      <button
        className="md:hidden fixed top-3 left-3 z-50 bg-[#1a1714] text-white p-2 rounded-lg"
        onClick={() => setOpen(true)}
      >
        <Menu size={20} />
      </button>

      {/* Mobile: drawer */}
      {open && (
        <>
          <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setOpen(false)} />
          <aside className="md:hidden fixed top-0 left-0 bottom-0 w-56 bg-[#1a1714] z-50 flex flex-col">
            <button className="absolute top-3 right-3 text-white/60 hover:text-white" onClick={() => setOpen(false)}>
              <X size={20} />
            </button>
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  )
}
