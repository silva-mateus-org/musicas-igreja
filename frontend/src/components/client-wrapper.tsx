'use client'

import { useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { CoreAuthProvider } from '@core/contexts/auth-context'
import { getQueryClient } from '@/lib/query-client'

export function ClientWrapper({ children }: { children: React.ReactNode }) {
    // This ensures that data is not shared between different users and requests
    // while still only creating the QueryClient once per component lifecycle
    const [queryClient] = useState(() => getQueryClient())

    return (
        <QueryClientProvider client={queryClient}>
            <CoreAuthProvider config={{ apiBasePath: '/api', storagePrefix: 'musicas_igreja_auth' }}>
                {children}
            </CoreAuthProvider>
        </QueryClientProvider>
    )
}
