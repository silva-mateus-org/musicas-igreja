'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@core/components/ui/card'
import { Button } from '@core/components/ui/button'
import { Label } from '@core/components/ui/label'
import { Badge } from '@core/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@core/components/ui/tooltip'
import { useAuth } from '@core/contexts/auth-context'
import {
    Settings,
    Save,
    FileCheck,
    RotateCcw,
    Shield,
    CheckCircle,
    Loader2,
    Search,
    User,
    Music,
    Hash,
    Database,
    Lock,
} from 'lucide-react'
import { useToast } from '@core/hooks/use-toast'
import { adminApi } from '@/lib/api'

const SESSION_KEY = 'pdf-verification-report'

interface DiscoveryResult {
    discovered: {
        artists: string[]
        categories: string[]
        musical_keys: string[]
    }
    registered: {
        artists: string[]
        categories: string[]
        musical_keys: string[]
    }
    stats: {
        total_files: number
        files_processed: number
    }
}

export default function SystemSettingsPage() {
    const { toast } = useToast()
    const router = useRouter()
    const { hasPermission, isAuthenticated } = useAuth()
    const isAdmin = hasPermission('admin:access')

    const [isRunning, setIsRunning] = useState(false)

    // Entity Discovery
    const [discoveryResult, setDiscoveryResult] = useState<DiscoveryResult | null>(null)
    const [isDiscovering, setIsDiscovering] = useState(false)
    const [isRegistering, setIsRegistering] = useState(false)
    const [selectedEntities, setSelectedEntities] = useState<{
        artists: string[]
        categories: string[]
    }>({
        artists: [],
        categories: []
    })

    const handleRunFullVerification = async () => {
        setIsRunning(true)
        try {
            const [verification, duplicates, legacyFiles] = await Promise.all([
                adminApi.verifyPdfs(),
                adminApi.findDuplicates(),
                adminApi.scanLegacyFiles(),
            ])

            sessionStorage.setItem(SESSION_KEY, JSON.stringify({
                verification,
                duplicates,
                legacyFiles,
                timestamp: Date.now(),
            }))

            const totalIssues =
                (verification.mismatched_count ?? 0)
                + (verification.conflicts?.length ?? 0)
                + (duplicates.total_groups ?? 0)
                + (legacyFiles.total_legacy_files ?? 0)

            if (totalIssues === 0) {
                toast({
                    title: "Verificação concluída",
                    description: `Todos os ${verification.total_files} arquivos estão corretos. Nenhum problema encontrado.`,
                })
            }

            router.push('/settings/system/report')
        } catch (error: any) {
            toast({
                title: "Erro na verificação",
                description: error.message,
                variant: "destructive",
            })
        } finally {
            setIsRunning(false)
        }
    }

    // Entity Discovery Functions
    const handleDiscoverEntities = async () => {
        setIsDiscovering(true)
        try {
            const data = await adminApi.discoverEntities()

            if (data.success) {
                setDiscoveryResult(data.data)
                setSelectedEntities({
                    artists: data.data.discovered.artists,
                    categories: data.data.discovered.categories,
                })
                toast({
                    title: "Descoberta concluída",
                    description: `Encontrados ${data.data.discovered.artists.length} artistas e ${data.data.discovered.categories.length} categorias não cadastrados.`,
                })
            } else {
                throw new Error(data.error || 'Erro na descoberta')
            }
        } catch (error: any) {
            toast({
                title: "Erro na descoberta",
                description: error.message,
                variant: "destructive",
            })
        } finally {
            setIsDiscovering(false)
        }
    }

    const handleRegisterEntities = async () => {
        if (Object.values(selectedEntities).every(arr => arr.length === 0)) {
            toast({
                title: "Nenhuma entidade selecionada",
                description: "Selecione pelo menos uma entidade para registrar.",
                variant: "destructive",
            })
            return
        }

        setIsRegistering(true)
        try {
            const data = await adminApi.registerEntities(selectedEntities)

            if (data.success) {
                toast({
                    title: "Registro concluído",
                    description: data.message,
                })
                handleDiscoverEntities()
            } else {
                throw new Error(data.error || 'Erro no registro')
            }
        } catch (error: any) {
            toast({
                title: "Erro no registro",
                description: error.message,
                variant: "destructive",
            })
        } finally {
            setIsRegistering(false)
        }
    }

    const handleCleanupEntities = async () => {
        try {
            const data = await adminApi.cleanupEntities()

            if (data.success) {
                toast({
                    title: "Limpeza concluída",
                    description: data.message,
                })
                if (discoveryResult) {
                    handleDiscoverEntities()
                }
            } else {
                throw new Error(data.error || 'Erro na limpeza')
            }
        } catch (error: any) {
            toast({
                title: "Erro na limpeza",
                description: error.message,
                variant: "destructive",
            })
        }
    }

    const handleEntitySelect = (type: keyof typeof selectedEntities, entity: string) => {
        setSelectedEntities(prev => ({
            ...prev,
            [type]: prev[type].includes(entity)
                ? prev[type].filter(e => e !== entity)
                : [...prev[type], entity]
        }))
    }

    const handleSelectAllEntities = (type: keyof typeof selectedEntities) => {
        if (!discoveryResult) return

        const allEntities = discoveryResult.discovered[type]
        setSelectedEntities(prev => ({
            ...prev,
            [type]: prev[type].length === allEntities.length ? [] : allEntities
        }))
    }

    if (!isAuthenticated) {
        return (
            <MainLayout>
                <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                    <Lock className="h-16 w-16 text-muted-foreground mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
                    <p className="text-muted-foreground">
                        Você precisa estar logado para acessar esta página.
                    </p>
                </div>
            </MainLayout>
        )
    }

    if (!isAdmin) {
        return (
            <MainLayout>
                <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                    <Lock className="h-16 w-16 text-muted-foreground mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Permissão Insuficiente</h2>
                    <p className="text-muted-foreground">
                        Somente administradores podem acessar as configurações do sistema.
                    </p>
                </div>
            </MainLayout>
        )
    }

    return (
        <MainLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <Settings className="h-8 w-8 text-primary" />
                            Configurações do Sistema
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Ferramentas administrativas e verificação do sistema
                        </p>
                    </div>
                </div>

                {/* Unified PDF Verification Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileCheck className="h-5 w-5" />
                            Verificação de PDFs
                        </CardTitle>
                        <CardDescription>
                            Executa uma verificação completa dos arquivos: nomes fora do padrão, duplicatas por título/artista/tom e arquivos legados não migrados para o workspace.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            onClick={handleRunFullVerification}
                            disabled={isRunning}
                            className="gap-2"
                            size="lg"
                        >
                            {isRunning ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <FileCheck className="h-4 w-4" />
                            )}
                            {isRunning ? 'Verificando...' : 'Executar Verificação Completa'}
                        </Button>
                    </CardContent>
                </Card>

                {/* Entity Discovery Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Database className="h-5 w-5" />
                            Descoberta de Entidades
                        </CardTitle>
                        <CardDescription>
                            Descubra e cadastre automaticamente artistas e categorias presentes nos arquivos
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        onClick={handleDiscoverEntities}
                                        disabled={isDiscovering}
                                        className="gap-2"
                                    >
                                        {isDiscovering ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Search className="h-4 w-4" />
                                        )}
                                        {isDiscovering ? 'Descobrindo...' : 'Descobrir Entidades'}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Analisar o banco de dados para encontrar entidades não cadastradas</p>
                                </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        onClick={handleCleanupEntities}
                                        variant="outline"
                                        className="gap-2"
                                    >
                                        <RotateCcw className="h-4 w-4" />
                                        Limpar Vazios
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Remover entidades vazias ou duplicadas</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>

                        {discoveryResult && (
                            <div className="space-y-4 border-t pt-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <Badge variant="outline" className="gap-1">
                                            <Music className="h-3 w-3" />
                                            {discoveryResult.stats.total_files} arquivos analisados
                                        </Badge>
                                        <Badge variant="outline" className="gap-1">
                                            <User className="h-3 w-3" />
                                            {discoveryResult.registered.artists.length} artistas cadastrados
                                        </Badge>
                                        <Badge variant="outline" className="gap-1">
                                            <Hash className="h-3 w-3" />
                                            {discoveryResult.registered.categories.length} categorias cadastradas
                                        </Badge>
                                    </div>

                                    {(discoveryResult.discovered.artists.length > 0 ||
                                        discoveryResult.discovered.categories.length > 0) && (
                                            <Button
                                                onClick={handleRegisterEntities}
                                                disabled={isRegistering || Object.values(selectedEntities).every(arr => arr.length === 0)}
                                                className="gap-2"
                                            >
                                                {isRegistering ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Save className="h-4 w-4" />
                                                )}
                                                Registrar Selecionados ({Object.values(selectedEntities).reduce((sum, arr) => sum + arr.length, 0)})
                                            </Button>
                                        )}
                                </div>

                                {discoveryResult.discovered.artists.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label className="flex items-center gap-2">
                                                <User className="h-4 w-4" />
                                                Artistas Descobertos ({discoveryResult.discovered.artists.length})
                                            </Label>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleSelectAllEntities('artists')}
                                            >
                                                {selectedEntities.artists.length === discoveryResult.discovered.artists.length
                                                    ? 'Desselecionar todos'
                                                    : 'Selecionar todos'}
                                            </Button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                                            {discoveryResult.discovered.artists.map((artist) => (
                                                <div
                                                    key={artist}
                                                    className="flex items-center gap-2 p-2 border rounded hover:bg-muted/50"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedEntities.artists.includes(artist)}
                                                        onChange={() => handleEntitySelect('artists', artist)}
                                                        className="rounded"
                                                    />
                                                    <span className="text-sm truncate">{artist}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {discoveryResult.discovered.categories.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label className="flex items-center gap-2">
                                                <Hash className="h-4 w-4" />
                                                Categorias Descobertas ({discoveryResult.discovered.categories.length})
                                            </Label>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleSelectAllEntities('categories')}
                                            >
                                                {selectedEntities.categories.length === discoveryResult.discovered.categories.length
                                                    ? 'Desselecionar todos'
                                                    : 'Selecionar todos'}
                                            </Button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                                            {discoveryResult.discovered.categories.map((category) => (
                                                <div
                                                    key={category}
                                                    className="flex items-center gap-2 p-2 border rounded hover:bg-muted/50"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedEntities.categories.includes(category)}
                                                        onChange={() => handleEntitySelect('categories', category)}
                                                        className="rounded"
                                                    />
                                                    <span className="text-sm truncate">{category}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {(discoveryResult.discovered.artists.length === 0 &&
                                    discoveryResult.discovered.categories.length === 0) && (
                                        <div className="text-center py-4 text-muted-foreground">
                                            <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                                            <p>Todas as entidades já estão cadastradas!</p>
                                        </div>
                                    )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* System Info */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            Informações do Sistema
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="font-medium">Versão:</span> 3.0.0
                            </div>
                            <div>
                                <span className="font-medium">Banco de Dados:</span> PostgreSQL
                            </div>
                            <div>
                                <span className="font-medium">Estrutura:</span> /organized
                            </div>
                            <div>
                                <span className="font-medium">Padrão de nome:</span> Música - Tom - Artista
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    )
}
