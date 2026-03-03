import { MainLayout } from '@/components/layout/main-layout'
import { Skeleton } from '@/components/ui/skeleton'

export default function ListsLoading() {
    return (
        <MainLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <Skeleton className="h-8 w-28" />
                        <Skeleton className="h-4 w-52" />
                    </div>
                    <Skeleton className="h-9 w-28" />
                </div>

                <div className="rounded-lg border bg-card">
                    <div className="p-4 border-b">
                        <Skeleton className="h-4 w-full" />
                    </div>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 border-b last:border-b-0">
                            <Skeleton className="h-4 w-48 flex-1" />
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-8 w-20" />
                        </div>
                    ))}
                </div>
            </div>
        </MainLayout>
    )
}
