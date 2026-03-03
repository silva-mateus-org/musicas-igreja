import { MainLayout } from '@/components/layout/main-layout'
import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
    return (
        <MainLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-72" />
                    </div>
                    <Skeleton className="h-9 w-24" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="rounded-lg border bg-card p-6 space-y-3">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-8 w-16" />
                            <Skeleton className="h-3 w-32" />
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {Array.from({ length: 2 }).map((_, i) => (
                        <div key={i} className="rounded-lg border bg-card p-6 space-y-4">
                            <Skeleton className="h-5 w-40" />
                            <Skeleton className="h-[200px] w-full" />
                        </div>
                    ))}
                </div>
            </div>
        </MainLayout>
    )
}
