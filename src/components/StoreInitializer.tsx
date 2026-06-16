'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/store'

/**
 * Dispara a hidratação do Zustand persist no cliente.
 * Deve ser renderizado dentro do Providers, antes de qualquer
 * componente que leia o store para evitar divergência SSR/Client (#418).
 */
export function StoreInitializer() {
  useEffect(() => {
    useAppStore.persist.rehydrate()
  }, [])

  return null
}
