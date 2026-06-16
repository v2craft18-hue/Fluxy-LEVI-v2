'use client'
import { useEffect } from 'react'
import { useAppStore } from '@/store'
import type { Usuario, Empresa } from '@/types'

interface Props {
  usuario: Usuario & { empresa_id?: string }
  empresa: Empresa | null
}

export function StoreHydrator({ usuario, empresa }: Props) {
  useEffect(() => {
    const store = useAppStore.getState()
    store.setUsuario(usuario as Usuario, usuario.empresa_id ?? null)
    store.setEmpresa(empresa)
    if (usuario.empresa_id) store.setEmpresaId(usuario.empresa_id)
  }, [usuario, empresa])
  return null
}
