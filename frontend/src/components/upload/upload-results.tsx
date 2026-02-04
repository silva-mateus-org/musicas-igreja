'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { UploadResponse } from '@/types'
import {
    CheckCircle2,
    AlertTriangle,
    Copy,
    FileText,
    ExternalLink,
    Music,
    XCircle
} from 'lucide-react'
import Link from 'next/link'

interface UploadResultsProps {
    results: UploadResponse
}

export function UploadResults({ results }: UploadResultsProps) {
    const successCount = results.files?.filter(f => f.status === 'success').length || 0
    const duplicateCount = results.files?.filter(f => f.status === 'duplicate').length || 0
    const errorCount = results.files?.filter(f => f.status === 'error').length || 0
    const totalCount = results.files?.length || 0

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'success':
                return <CheckCircle2 className="h-5 w-5 text-green-600" />
            case 'duplicate':
                return <Copy className="h-5 w-5 text-yellow-600" />
            case 'error':
                return <XCircle className="h-5 w-5 text-red-600" />
            default:
                return <AlertTriangle className="h-5 w-5 text-muted-foreground" />
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'success':
                return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800">✓ Sucesso</Badge>
            case 'duplicate':
                return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800">⚠ Duplicata</Badge>
            case 'error':
                return <Badge variant="destructive">✗ Erro</Badge>
            default:
                return <Badge variant="outline">? Desconhecido</Badge>
        }
    }

    const getStatusMessage = (file: any) => {
        switch (file.status) {
            case 'success':
                return file.message || 'Arquivo enviado com sucesso'
            case 'duplicate':
                return file.message || (file.duplicate_of
                    ? `Duplicata detectada: ${file.duplicate_of}`
                    : 'Arquivo já existe no sistema (MD5 idêntico)')
            case 'error':
                return file.message || 'Erro ao processar arquivo'
            default:
                return file.message || 'Status desconhecido'
        }
    }

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
        return `${(bytes / 1024 / 1024).toFixed(2)} MB`
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    {successCount === totalCount ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : errorCount > 0 ? (
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    ) : (
                        <FileText className="h-5 w-5 text-primary" />
                    )}
                    Resultado do Upload
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-muted/50 rounded-lg border border-border">
                        <div className="text-2xl font-bold text-foreground">{totalCount}</div>
                        <div className="text-sm text-muted-foreground">Total Processados</div>
                    </div>

                    <div className="text-center p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-900">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-500">{successCount}</div>
                        <div className="text-sm text-green-700 dark:text-green-400">Enviados com Sucesso</div>
                    </div>

                    {duplicateCount > 0 && (
                        <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-900">
                            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-500">{duplicateCount}</div>
                            <div className="text-sm text-yellow-700 dark:text-yellow-400">Duplicatas Detectadas</div>
                        </div>
                    )}

                    {errorCount > 0 && (
                        <div className="text-center p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-900">
                            <div className="text-2xl font-bold text-red-600 dark:text-red-500">{errorCount}</div>
                            <div className="text-sm text-red-700 dark:text-red-400">Erros</div>
                        </div>
                    )}
                </div>

                <Separator />

                {/* Files List */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-lg">Detalhes dos Arquivos</h4>
                        <Badge variant="outline" className="font-mono">
                            {totalCount} {totalCount === 1 ? 'arquivo' : 'arquivos'}
                        </Badge>
                    </div>

                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {results.files?.map((file, index) => (
                            <Card 
                                key={index} 
                                className={`p-4 transition-all hover:shadow-md ${
                                    file.status === 'success' ? 'border-green-200 dark:border-green-900 bg-green-50/30 dark:bg-green-950/10' :
                                    file.status === 'duplicate' ? 'border-yellow-200 dark:border-yellow-900 bg-yellow-50/30 dark:bg-yellow-950/10' :
                                    file.status === 'error' ? 'border-red-200 dark:border-red-900 bg-red-50/30 dark:bg-red-950/10' :
                                    'border-border'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3 min-w-0 flex-1">
                                        <div className="mt-1">
                                            {getStatusIcon(file.status)}
                                        </div>

                                        <div className="min-w-0 flex-1 space-y-2">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="font-semibold truncate text-base">
                                                    {file.original_name}
                                                </p>
                                                {getStatusBadge(file.status)}
                                            </div>

                                            {/* Mostrar nome final gerado se for sucesso e diferente do original */}
                                            {file.status === 'success' && file.filename && file.filename !== file.original_name && (
                                                <div className="text-sm p-2 bg-white/50 dark:bg-black/20 rounded border border-green-200 dark:border-green-900">
                                                    <span className="font-medium text-green-700 dark:text-green-400">📄 Nome padronizado:</span>{' '}
                                                    <span className="text-muted-foreground font-mono text-xs">{file.filename}</span>
                                                </div>
                                            )}

                                            <p className={`text-sm ${
                                                file.status === 'success' ? 'text-green-700 dark:text-green-400' :
                                                file.status === 'duplicate' ? 'text-yellow-700 dark:text-yellow-400' :
                                                file.status === 'error' ? 'text-red-700 dark:text-red-400' :
                                                'text-muted-foreground'
                                            }`}>
                                                {getStatusMessage(file)}
                                            </p>

                                            {file.size && (
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <FileText className="h-3 w-3" />
                                                    <span>Tamanho: {formatFileSize(file.size)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {file.status === 'success' && file.file_id && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            asChild
                                            className="gap-2 shrink-0"
                                        >
                                            <Link href={`/music?search=${encodeURIComponent(file.original_name)}`}>
                                                <ExternalLink className="h-4 w-4" />
                                                <span className="hidden sm:inline">Ver</span>
                                            </Link>
                                        </Button>
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>

                <Separator />

                {/* Summary Message */}
                <div className={`p-4 rounded-lg border ${
                    errorCount > 0 
                        ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800' 
                        : 'bg-primary/5 border-primary/20'
                }`}>
                    <div className="flex items-start gap-3">
                        {errorCount > 0 ? (
                            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5" />
                        ) : (
                            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500 shrink-0 mt-0.5" />
                        )}
                        <div className="space-y-1">
                            <p className="font-medium">
                                {successCount === totalCount 
                                    ? '✓ Todos os arquivos foram processados com sucesso!'
                                    : errorCount > 0
                                    ? '⚠ Upload concluído com alguns problemas'
                                    : '✓ Upload concluído'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {successCount > 0 && `${successCount} arquivo${successCount !== 1 ? 's' : ''} enviado${successCount !== 1 ? 's' : ''} com sucesso. `}
                                {duplicateCount > 0 && `${duplicateCount} duplicata${duplicateCount !== 1 ? 's' : ''} detectada${duplicateCount !== 1 ? 's' : ''} (MD5 idêntico). `}
                                {errorCount > 0 && `${errorCount} erro${errorCount !== 1 ? 's' : ''} encontrado${errorCount !== 1 ? 's' : ''}.`}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                    {successCount > 0 && (
                        <Button asChild className="gap-2">
                            <Link href="/music">
                                <Music className="h-4 w-4" />
                                Ver Todas as Músicas
                            </Link>
                        </Button>
                    )}

                    <Button variant="outline" asChild className="gap-2">
                        <Link href="/upload">
                            <FileText className="h-4 w-4" />
                            Fazer Novo Upload
                        </Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}