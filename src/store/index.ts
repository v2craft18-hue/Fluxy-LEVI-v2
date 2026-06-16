// ================================================================
// FLUXY — Store Global Multi-Tenant (Zustand)
// ================================================================

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Usuario, Empresa } from '@/types'

export type FormatoImpressao = 'a4' | 'termica'

interface AppStore {
  usuario: Usuario | null
  empresa: Empresa | null
  empresaId: string | null
  formatoImpressao: FormatoImpressao

  setUsuario: (u: Usuario | null, empresaId?: string | null) => void
  setEmpresa: (e: Empresa | null) => void
  setEmpresaId: (id: string | null) => void
  setFormatoImpressao: (f: FormatoImpressao) => void
  clear: () => void
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      usuario: null,
      empresa: null,
      empresaId: null,
      formatoImpressao: 'a4',

      // empresaId passado separadamente pois não consta no type Usuario
      setUsuario: (usuario, empresaId = null) => set({ usuario, empresaId }),
      setEmpresa: (empresa) => set({ empresa }),
      setEmpresaId: (empresaId) => set({ empresaId }),
      setFormatoImpressao: (formatoImpressao) => set({ formatoImpressao }),
      clear: () => set({ usuario: null, empresa: null, empresaId: null }),
    }),
    {
      name: 'fluxy-app',
      partialize: (state) => ({
        empresaId: state.empresaId,
        formatoImpressao: state.formatoImpressao,
      }),
    }
  )
)

export function useEmpresaId(): string {
  const empresaId = useAppStore(s => s.empresaId)
  if (!empresaId) throw new Error('Usuário não está associado a uma empresa.')
  return empresaId
}
