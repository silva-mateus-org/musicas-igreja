'use client'

import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@core/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { LoadingOverlay } from '@/components/ui/loading-spinner'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyState } from '@/components/ui/empty-state'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { DashboardCharts } from '@/components/dashboard/charts'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { useDashboardStats } from '@/hooks/use-dashboard'
import { useAuth } from '@core/contexts/auth-context'
import { BarChart3, RefreshCw, Lock } from 'lucide-react'
import { InstructionsModal, PAGE_INSTRUCTIONS } from '@/components/ui/instructions-modal'
import { SimpleTooltip } from '@/components/ui/simple-tooltip'

export default function DashboardPage() {
    const { isAuthenticated } = useAuth()
    const { data: stats, isLoading, error, refetch } = useDashboardStats()

    if (!isAuthenticated) {
        return (
            <MainLayout>
                <EmptyState
                    icon={Lock}
                    title="Acesso Restrito"
                    description="Você precisa estar logado para acessar o dashboard."
                    className="min-h-[400px]"
                />
            </MainLayout>
        )
    }

    if (isLoading) {
        return (
            <MainLayout>
                <LoadingOverlay message="Carregando dashboard..." />
            </MainLayout>
        )
    }

    if (error) {
        return (
            <MainLayout>
                <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
            </MainLayout>
        )
    }

    return (
        <MainLayout>
            <div className="space-y-6">
                <PageHeader
                    icon={BarChart3}
                    title="Dashboard"
                    description="Visão geral das suas cifras e partituras"
                >
                    <div className="flex items-center gap-2">
                        <InstructionsModal
                            title={PAGE_INSTRUCTIONS.dashboard.title}
                            description={PAGE_INSTRUCTIONS.dashboard.description}
                            sections={PAGE_INSTRUCTIONS.dashboard.sections}
                        />
                        <SimpleTooltip label="Recarregar dados do dashboard">
                            <Button onClick={() => refetch()} variant="outline" size="sm" className="gap-2">
                                <RefreshCw className="h-4 w-4" />
                                <span className="hidden sm:inline">Atualizar</span>
                            </Button>
                        </SimpleTooltip>
                    </div>
                </PageHeader>

                <StatsCards stats={stats} />
                <DashboardCharts />
                <QuickActions />
            </div>
        </MainLayout>
    )
}
