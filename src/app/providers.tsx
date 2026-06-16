'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'
import { StoreInitializer } from '@/components/StoreInitializer'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60,       // 1 minuto
        gcTime: 1000 * 60 * 10,     // 10 minutos
        retry: 1,
        refetchOnWindowFocus: true,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <StoreInitializer />
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
    </QueryClientProvider>
  )
}
