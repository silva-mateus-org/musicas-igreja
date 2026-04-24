'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@core/components/ui/card'
import { Button } from '@core/components/ui/button'
import { Loader2, Wand2, AlertTriangle, RefreshCw, FileText } from 'lucide-react'
import { useToast } from '@core/hooks/use-toast'
import { musicApi } from '@/lib/api'
import { musicKeys } from '@/hooks/use-music'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

type OcrStatus = 'none' | 'queued' | 'processing' | 'done' | 'done_low_confidence' | 'failed'

interface Props {
    musicId: number
    contentType: 'pdf_only' | 'chord' | 'chord_converting' | undefined
    ocrStatus?: string
    canConvert: boolean
}

export function OcrConvertCard({ musicId, contentType, ocrStatus, canConvert }: Props) {
    const router = useRouter()
    const queryClient = useQueryClient()
    const { toast } = useToast()

    const [confirmOpen, setConfirmOpen] = useState(false)
    const [triggering, setTriggering] = useState(false)
    const [polledStatus, setPolledStatus] = useState<OcrStatus>((ocrStatus as OcrStatus) || 'none')
    const [polledError, setPolledError] = useState<string | undefined>(undefined)

    const isConverting = contentType === 'chord_converting'
    const isFailed = polledStatus === 'failed'

    useEffect(() => {
        if (!isConverting) return

        let cancelled = false
        const poll = async () => {
            try {
                const res = await musicApi.getOcrStatus(musicId)
                if (cancelled) return
                setPolledStatus(res.status as OcrStatus)
                setPolledError(res.error)

                if (res.status === 'done' || res.status === 'done_low_confidence') {
                    await queryClient.invalidateQueries({ queryKey: musicKeys.detail(musicId) })
                    const lowConfidence = res.status === 'done_low_confidence'
                    toast({
                        title: 'Cifra extraída',
                        description: lowConfidence
                            ? 'Extração concluída com baixa confiança. Revise o conteúdo antes de usar.'
                            : 'Revise o conteúdo e ajuste se necessário.',
                        variant: lowConfidence ? 'destructive' : 'default',
                    })
                    router.push(`/music/${musicId}/chord`)
                } else if (res.status === 'failed') {
                    await queryClient.invalidateQueries({ queryKey: musicKeys.detail(musicId) })
                }
            } catch {
                // ignore transient poll errors
            }
        }

        poll()
        const id = setInterval(poll, 2000)
        return () => {
            cancelled = true
            clearInterval(id)
        }
    }, [isConverting, musicId, queryClient, router, toast])

    const handleConvert = async () => {
        setConfirmOpen(false)
        try {
            setTriggering(true)
            await musicApi.triggerOcr(musicId)
            await queryClient.invalidateQueries({ queryKey: musicKeys.detail(musicId) })
            toast({ title: 'Conversão iniciada', description: 'Extraindo cifra do PDF…' })
        } catch (error) {
            toast({
                title: 'Erro',
                description: error instanceof Error ? error.message : 'Falha ao iniciar conversão',
                variant: 'destructive',
            })
        } finally {
            setTriggering(false)
        }
    }

    if (contentType === 'chord') return null
    if (!canConvert && !isConverting) return null

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Wand2 className="h-5 w-5" />
                        Converter PDF para Cifra Editável
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {isConverting && !isFailed && (
                        <div className="flex items-start gap-3 rounded-md bg-muted/50 p-3">
                            <Loader2 className="h-5 w-5 animate-spin shrink-0 mt-0.5" />
                            <div className="text-sm">
                                <p className="font-medium">Extraindo cifra…</p>
                                <p className="text-muted-foreground">
                                    Processando texto e acordes. Isso pode levar até 30 segundos.
                                </p>
                            </div>
                        </div>
                    )}

                    {isFailed && (
                        <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                            <div className="text-sm flex-1">
                                <p className="font-medium text-destructive">Falha na extração</p>
                                <p className="text-muted-foreground break-words">
                                    {polledError || 'Não foi possível extrair a cifra deste PDF.'}
                                </p>
                            </div>
                        </div>
                    )}

                    {!isConverting && canConvert && (
                        <>
                            <p className="text-sm text-muted-foreground">
                                Extraímos texto e acordes automaticamente. Você poderá editar, transpor e
                                exportar em outros tons. O PDF original é mantido.
                            </p>
                            <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                                <FileText className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                Melhor resultado em PDFs digitais. PDFs escaneados podem exigir revisão.
                            </p>
                            <Button
                                onClick={() => setConfirmOpen(true)}
                                disabled={triggering}
                                className="gap-2"
                            >
                                {triggering ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : isFailed ? (
                                    <RefreshCw className="h-4 w-4" />
                                ) : (
                                    <Wand2 className="h-4 w-4" />
                                )}
                                {isFailed ? 'Tentar Novamente' : 'Converter para Cifra'}
                            </Button>
                        </>
                    )}
                </CardContent>
            </Card>

            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Converter PDF para cifra?"
                description="A conversão pode levar até 30 segundos. A qualidade depende do PDF — PDFs digitais funcionam melhor que escaneados. O PDF original é preservado e você poderá revisar e ajustar o conteúdo extraído."
                confirmText="Converter"
                cancelText="Cancelar"
                onConfirm={handleConvert}
            />
        </>
    )
}
