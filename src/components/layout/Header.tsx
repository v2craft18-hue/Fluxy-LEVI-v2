'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Bell, User, Lock, LogOut, ChevronDown } from 'lucide-react'
import type { Usuario, Empresa } from '@/types'
import { createClient } from '@/lib/supabase'

interface Props {
  usuario: Usuario
  empresa: Empresa | null
}

export function Header({ usuario, empresa }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const inicial = usuario.nome.charAt(0).toUpperCase()

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="fixed top-0 right-0 left-0 md:left-56 h-14 bg-white border-b border-gray-200 z-40 flex items-center justify-between px-4 md:px-5">
      <div className="w-8 md:w-0" />
      <p className="md:hidden text-sm font-semibold text-gray-700 truncate">{empresa?.nome || 'Fluxy'}</p>

      <div className="flex items-center gap-3">
        <button className="relative text-gray-400 hover:text-gray-600 transition" title="Notificações">
          <Bell size={18} />
        </button>

        {/* Dropdown de perfil */}
        <div className="relative" ref={ref}>
          <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 hover:opacity-80 transition">
            {usuario.avatar_url
              ? <Image src={usuario.avatar_url} alt={usuario.nome} width={28} height={28} className="w-7 h-7 rounded-lg object-cover" />
              : <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center text-white text-xs font-bold">{inicial}</div>
            }
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-gray-800 leading-tight">{usuario.nome}</p>
              <p className="text-[10px] text-gray-400 capitalize">{usuario.perfil}</p>
            </div>
            <ChevronDown size={14} className="text-gray-400 hidden md:block" />
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-gray-200 rounded-xl shadow-lg py-1.5 z-50">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-800 truncate">{usuario.nome}</p>
                <p className="text-xs text-gray-400 truncate">{usuario.email}</p>
              </div>
              <Link href="/perfil" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition">
                <User size={15} /> Meu Perfil
              </Link>
              <Link href="/perfil#senha" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition">
                <Lock size={15} /> Alterar Senha
              </Link>
              <div className="border-t border-gray-100 my-1" />
              <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition">
                <LogOut size={15} /> Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
