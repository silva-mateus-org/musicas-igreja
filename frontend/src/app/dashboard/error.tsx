"use client"

import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MainLayout } from "@/components/layout/main-layout"

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return (
        <MainLayout>
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
                <div className="p-4 bg-destructive/10 rounded-full">
                    <AlertTriangle className="h-8 w-8 text-destructive" />
                </div>
                <div className="space-y-1">
                    <h2 className="text-lg font-semibold">Erro ao carregar dashboard</h2>
                    <p className="text-sm text-muted-foreground max-w-sm">
                        {error.message || "Não foi possível carregar o dashboard. Tente novamente."}
                    </p>
                </div>
                <Button onClick={reset} variant="outline" size="sm">
                    Tentar novamente
                </Button>
            </div>
        </MainLayout>
    )
}
