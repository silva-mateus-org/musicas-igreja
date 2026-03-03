import { MainLayout } from '@/components/layout/main-layout'
import { Skeleton } from '@/components/ui/skeleton'

export default function SettingsLoading() {
    return (
        <MainLayout>
            <div className="space-y-6">
                <div className="space-y-1">
                    <Skeleton className="h-8 w-40" />
                    <Skeleton className="h-4 w-64" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="rounded-lg border bg-card p-6 space-y-3">
                            <Skeleton className="h-10 w-10 rounded-lg" />
                            <Skeleton className="h-5 w-36" />
                            <Skeleton className="h-4 w-48" />
                        </div>
                    ))}
                </div>
            </div>
        </MainLayout>
    )
}
