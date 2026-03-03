'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@core/components/ui/card'
import { Button } from '@core/components/ui/button'
import { Badge } from '@core/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@core/components/ui/tooltip'
import { useAuth } from '@core/contexts/auth-context'
import {
    FileCheck,
    RotateCcw,
    CheckCircle,
    AlertCircle,
    Loader2,
    User,
    Music,
    Lock,
    Copy,
    Calendar,
    FileText,
    ChevronDown,
    ChevronRight,
    Replace,
    Trash2,
    ArrowRight,
    ArrowLeft,
    HardDrive,
    FolderSync,
} from 'lucide-react'
import { useToast } from '@core/hooks/use-toast'
import { adminApi } from '@/lib/api'

const SESSION_KEY = 'pdf-verification-report'
const MAX_AGE_MS = 30 * 60 * 1000

interface MismatchedFile {
    id: number
    current_filename: string
    expected_filename: string
    song_name: string
    artist: string
    musical_key: string
    file_path: string
}

interface ConflictFileInfo {
    id: number
    filename: string
    file_path: string
    file_size: number
    upload_date: string
}

interface NameConflict {
    file_to_fix: ConflictFileInfo
    conflicting_file: ConflictFileInfo | null
    expected_filename: string
    song_name: string
    artist: string
    musical_key: string
}

interface VerificationResult {
    total_files: number
    mismatched_count: number
    mismatched_files: MismatchedFile[]
    conflicts: NameConflict[]
}

interface DuplicateFile {
    id: number
    filename: string
    file_path: string
    file_size: number
    upload_date: string
    workspace_id: number
}

interface DuplicateGroup {
    song_name: string
    artist: string
    musical_key: string
    files: DuplicateFile[]
}

interface DuplicateResult {
    total_groups: number
    total_duplicate_files: number
    groups: DuplicateGroup[]
}

interface LegacyFileItem {
    filename: string
    relative_path: string
    size: number
    is_duplicate: boolean
}

interface LegacyDirectory {
    directory: string
    file_count: number
    files: LegacyFileItem[]
}

interface LegacyScanResult {
    legacy_directories: LegacyDirectory[]
    total_legacy_files: number
    duplicate_count: number
    unique_count: number
    total_size_bytes: number
    total_size_mb: number
}

interface ReportData {
    verification: VerificationResult
    duplicates: DuplicateResult
    legacyFiles: LegacyScanResult
    timestamp: number
}

export default function VerificationReportPage() {
    const { toast } = useToast()
    const router = useRouter()
    const { hasPermission, isAuthenticated } = useAuth()
    const isAdmin = hasPermission('admin:access')

    const [reportData, setReportData] = useState<ReportData | null>(null)
    const [isExpired, setIsExpired] = useState(false)
    const [isRerunning, setIsRerunning] = useState(false)

    // Section 1: Name verification
    const [selectedFiles, setSelectedFiles] = useState<number[]>([])
    const [isFixing, setIsFixing] = useState(false)
    const [expandedConflict, setExpandedConflict] = useState<number | null>(null)
    const [selectedConflictFile, setSelectedConflictFile] = useState<Record<number, number>>({})
    const [resolvingConflict, setResolvingConflict] = useState<number | null>(null)

    // Section 2: Duplicates
    const [expandedGroup, setExpandedGroup] = useState<number | null>(null)
    const [selectedFilePerGroup, setSelectedFilePerGroup] = useState<Record<number, number>>({})
    const [replacingGroup, setReplacingGroup] = useState<number | null>(null)

    // Section 3: Legacy files
    const [isCleaning, setIsCleaning] = useState(false)

    // Shared PDF previews
    const [pdfUrls, setPdfUrls] = useState<Record<number, string>>({})
    const [loadingPdfs, setLoadingPdfs] = useState<Record<number, boolean>>({})

    // Collapsible sections
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        names: true,
        duplicates: true,
        legacy: true,
    })

    useEffect(() => {
        const raw = sessionStorage.getItem(SESSION_KEY)
        if (!raw) {
            setIsExpired(true)
            return
        }
        try {
            const data: ReportData = JSON.parse(raw)
            if (Date.now() - data.timestamp > MAX_AGE_MS) {
                setIsExpired(true)
                return
            }
            setReportData(data)
        } catch {
            setIsExpired(true)
        }
    }, [])

    useEffect(() => {
        return () => {
            Object.values(pdfUrls).forEach(url => URL.revokeObjectURL(url))
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const toggleSection = (key: string) => {
        setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))
    }

    // --- Re-run all checks ---
    const handleRerun = async () => {
        setIsRerunning(true)
        try {
            const [verification, duplicates, legacyFiles] = await Promise.all([
                adminApi.verifyPdfs(),
                adminApi.findDuplicates(),
                adminApi.scanLegacyFiles(),
            ])
            const newData: ReportData = { verification, duplicates, legacyFiles, timestamp: Date.now() }
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(newData))
            setReportData(newData)
            setIsExpired(false)
            setSelectedFiles([])
            setExpandedConflict(null)
            setSelectedConflictFile({})
            setExpandedGroup(null)
            setSelectedFilePerGroup({})
            Object.values(pdfUrls).forEach(url => URL.revokeObjectURL(url))
            setPdfUrls({})
            toast({ title: "Verificação atualizada", description: "Relatório atualizado com sucesso." })
        } catch (error: any) {
            toast({ title: "Erro na verificação", description: error.message, variant: "destructive" })
        } finally {
            setIsRerunning(false)
        }
    }

    // --- PDF preview ---
    const loadPdfPreview = async (fileId: number) => {
        if (pdfUrls[fileId] || loadingPdfs[fileId]) return
        setLoadingPdfs(prev => ({ ...prev, [fileId]: true }))
        try {
            const response = await fetch(`/api/files/${fileId}/stream`, { credentials: 'include', cache: 'no-store' })
            if (!response.ok) throw new Error('Falha ao carregar PDF')
            const blob = await response.blob()
            setPdfUrls(prev => ({ ...prev, [fileId]: URL.createObjectURL(blob) }))
        } catch {
            // iframe will show error
        } finally {
            setLoadingPdfs(prev => ({ ...prev, [fileId]: false }))
        }
    }

    // --- Section 1: Name fix handlers ---
    const handleSelectAll = () => {
        if (!reportData) return
        const all = reportData.verification.mismatched_files.map(f => f.id)
        setSelectedFiles(prev => prev.length === all.length ? [] : all)
    }

    const handleFixPdfs = async () => {
        if (selectedFiles.length === 0) return
        setIsFixing(true)
        try {
            const data = await adminApi.fixPdfNames(selectedFiles)
            const parts: string[] = []
            if (data.fixed_count > 0) parts.push(`${data.fixed_count} corrigido(s)`)
            if (data.skipped_duplicates > 0) parts.push(`${data.skipped_duplicates} ignorado(s) por conflito`)
            if (data.errors?.length > 0) parts.push(`${data.errors.length} erro(s)`)
            const hasIssues = data.skipped_duplicates > 0 || data.errors?.length > 0
            toast({
                title: hasIssues ? "Correção parcial" : "Correção concluída",
                description: parts.join(', ') + (data.errors?.length ? `: ${data.errors[0]}` : '.'),
                variant: hasIssues ? "destructive" : "default",
            })
            // Refresh only verification data
            const verification = await adminApi.verifyPdfs()
            setReportData(prev => prev ? { ...prev, verification, timestamp: Date.now() } : prev)
            setSelectedFiles([])
        } catch (error: any) {
            toast({ title: "Erro na correção", description: error.message, variant: "destructive" })
        } finally {
            setIsFixing(false)
        }
    }

    const handleToggleConflict = (cIdx: number, conflict: NameConflict) => {
        if (expandedConflict === cIdx) {
            setExpandedConflict(null)
        } else {
            setExpandedConflict(cIdx)
            loadPdfPreview(conflict.file_to_fix.id)
            if (conflict.conflicting_file) loadPdfPreview(conflict.conflicting_file.id)
        }
    }

    const handleResolveConflict = async (cIdx: number) => {
        if (!reportData) return
        const keepId = selectedConflictFile[cIdx]
        if (!keepId) return
        const conflict = reportData.verification.conflicts[cIdx]
        const removeId = keepId === conflict.file_to_fix.id ? conflict.conflicting_file?.id : conflict.file_to_fix.id
        if (!removeId) return

        setResolvingConflict(cIdx)
        try {
            const data = await adminApi.replaceDuplicates(keepId, [removeId])
            if (data.success) {
                toast({
                    title: "Conflito resolvido",
                    description: data.message + (data.lists_updated > 0 ? ` ${data.lists_updated} lista(s) atualizada(s).` : ''),
                })
                if (pdfUrls[removeId]) {
                    URL.revokeObjectURL(pdfUrls[removeId])
                    setPdfUrls(prev => { const next = { ...prev }; delete next[removeId]; return next })
                }
                setReportData(prev => {
                    if (!prev) return prev
                    const newConflicts = prev.verification.conflicts.filter((_, i) => i !== cIdx)
                    return { ...prev, verification: { ...prev.verification, conflicts: newConflicts } }
                })
                setExpandedConflict(null)
                setSelectedConflictFile(prev => { const next = { ...prev }; delete next[cIdx]; return next })
            } else {
                throw new Error(data.error)
            }
        } catch (error: any) {
            toast({ title: "Erro na resolução", description: error.message, variant: "destructive" })
        } finally {
            setResolvingConflict(null)
        }
    }

    // --- Section 2: Duplicate handlers ---
    const handleToggleGroup = (gIdx: number, files: DuplicateFile[]) => {
        if (expandedGroup === gIdx) {
            setExpandedGroup(null)
        } else {
            setExpandedGroup(gIdx)
            files.forEach(f => loadPdfPreview(f.id))
        }
    }

    const handleReplaceDuplicates = async (gIdx: number) => {
        if (!reportData) return
        const keepFileId = selectedFilePerGroup[gIdx]
        if (!keepFileId) return
        const group = reportData.duplicates.groups[gIdx]
        const removeFileIds = group.files.filter(f => f.id !== keepFileId).map(f => f.id)

        setReplacingGroup(gIdx)
        try {
            const data = await adminApi.replaceDuplicates(keepFileId, removeFileIds)
            if (data.success) {
                toast({
                    title: "Substituição concluída",
                    description: data.message
                        + (data.lists_updated > 0 ? ` ${data.lists_updated} lista(s) atualizada(s).` : '')
                        + (data.items_removed > 0 ? ` ${data.items_removed} referência(s) removida(s).` : ''),
                })
                removeFileIds.forEach(id => {
                    if (pdfUrls[id]) {
                        URL.revokeObjectURL(pdfUrls[id])
                        setPdfUrls(prev => { const next = { ...prev }; delete next[id]; return next })
                    }
                })
                setReportData(prev => {
                    if (!prev) return prev
                    const newGroups = prev.duplicates.groups.filter((_, i) => i !== gIdx)
                    return {
                        ...prev,
                        duplicates: {
                            total_groups: newGroups.length,
                            total_duplicate_files: newGroups.reduce((sum, g) => sum + g.files.length, 0),
                            groups: newGroups,
                        }
                    }
                })
                setExpandedGroup(null)
                setSelectedFilePerGroup(prev => { const next = { ...prev }; delete next[gIdx]; return next })
            } else {
                throw new Error(data.error)
            }
        } catch (error: any) {
            toast({ title: "Erro na substituição", description: error.message, variant: "destructive" })
        } finally {
            setReplacingGroup(null)
        }
    }

    // --- Section 3: Legacy cleanup handler ---
    const handleCleanupLegacyFiles = async () => {
        setIsCleaning(true)
        try {
            const data = await adminApi.cleanupLegacyFiles()
            const parts: string[] = []
            if (data.deleted > 0) parts.push(`${data.deleted} duplicado(s) excluído(s)`)
            if (data.moved > 0) parts.push(`${data.moved} arquivo(s) movido(s)`)
            if (data.directories_removed > 0) parts.push(`${data.directories_removed} diretório(s) removido(s)`)
            toast({
                title: "Limpeza concluída",
                description: parts.length > 0 ? parts.join(', ') + '.' : 'Nenhuma ação necessária.',
            })
            const legacyFiles = await adminApi.scanLegacyFiles()
            setReportData(prev => prev ? { ...prev, legacyFiles, timestamp: Date.now() } : prev)
        } catch (error: any) {
            toast({ title: "Erro na limpeza", description: error.message, variant: "destructive" })
        } finally {
            setIsCleaning(false)
        }
    }

    // --- Permission & expiry guards ---
    if (!isAuthenticated) {
        return (
            <MainLayout>
                <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                    <Lock className="h-16 w-16 text-muted-foreground mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
                    <p className="text-muted-foreground">Você precisa estar logado para acessar esta página.</p>
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
                    <p className="text-muted-foreground">Somente administradores podem acessar esta página.</p>
                </div>
            </MainLayout>
        )
    }

    if (isExpired || !reportData) {
        return (
            <MainLayout>
                <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                    <FileCheck className="h-16 w-16 text-muted-foreground mb-4" />
                    <h2 className="text-xl font-semibold mb-2">
                        {isExpired ? 'Dados expirados' : 'Nenhum dado disponível'}
                    </h2>
                    <p className="text-muted-foreground mb-4">
                        {isExpired
                            ? 'Os dados da verificação expiraram. Execute uma nova verificação.'
                            : 'Execute a verificação de PDFs para gerar o relatório.'}
                    </p>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => router.push('/settings/system')} className="gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            Voltar
                        </Button>
                        <Button onClick={handleRerun} disabled={isRerunning} className="gap-2">
                            {isRerunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                            {isRerunning ? 'Verificando...' : 'Executar Verificação'}
                        </Button>
                    </div>
                </div>
            </MainLayout>
        )
    }

    const { verification, duplicates, legacyFiles } = reportData
    const nameIssues = verification.mismatched_count + (verification.conflicts?.length ?? 0)
    const dupIssues = duplicates.total_groups
    const legacyIssues = legacyFiles.total_legacy_files
    const totalIssues = nameIssues + dupIssues + legacyIssues

    return (
        <MainLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <Button variant="ghost" size="sm" onClick={() => router.push('/settings/system')} className="gap-1 -ml-2">
                                <ArrowLeft className="h-4 w-4" />
                                Voltar
                            </Button>
                        </div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <FileCheck className="h-8 w-8 text-primary" />
                            Relatório de Verificação
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            {totalIssues === 0
                                ? 'Nenhum problema encontrado.'
                                : `${totalIssues} problema(s) encontrado(s) em ${verification.total_files} arquivos.`
                            }
                        </p>
                    </div>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button onClick={handleRerun} disabled={isRerunning} variant="outline" className="gap-2">
                                {isRerunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                                Verificar Novamente
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Executar todas as verificações novamente</TooltipContent>
                    </Tooltip>
                </div>

                {/* Summary Badges */}
                <div className="flex items-center gap-3 flex-wrap">
                    <Badge variant="outline" className="gap-1 text-sm py-1">
                        <CheckCircle className="h-3.5 w-3.5" />
                        {verification.total_files} arquivos analisados
                    </Badge>
                    {nameIssues > 0 && (
                        <Badge variant="destructive" className="gap-1 text-sm py-1">
                            <AlertCircle className="h-3.5 w-3.5" />
                            {nameIssues} nome(s) incorreto(s)
                        </Badge>
                    )}
                    {dupIssues > 0 && (
                        <Badge variant="destructive" className="gap-1 text-sm py-1">
                            <Copy className="h-3.5 w-3.5" />
                            {dupIssues} grupo(s) de duplicatas
                        </Badge>
                    )}
                    {legacyIssues > 0 && (
                        <Badge variant="secondary" className="gap-1 text-sm py-1 border-orange-500 text-orange-600">
                            <FolderSync className="h-3.5 w-3.5" />
                            {legacyIssues} arquivo(s) legado(s)
                        </Badge>
                    )}
                    {totalIssues === 0 && (
                        <Badge variant="outline" className="gap-1 text-sm py-1 border-green-500 text-green-600">
                            <CheckCircle className="h-3.5 w-3.5" />
                            Tudo correto
                        </Badge>
                    )}
                </div>

                {/* ============ SECTION 1: Name Verification ============ */}
                {nameIssues > 0 && (
                    <Card>
                        <CardHeader className="cursor-pointer" onClick={() => toggleSection('names')}>
                            <CardTitle className="flex items-center gap-2">
                                {openSections.names ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                                <FileCheck className="h-5 w-5" />
                                Nomes Incorretos
                                <Badge variant="destructive" className="ml-2">{nameIssues}</Badge>
                            </CardTitle>
                            <CardDescription>
                                Arquivos cujo nome não segue o padrão &quot;Música - Tom - Artista&quot;
                            </CardDescription>
                        </CardHeader>
                        {openSections.names && (
                            <CardContent className="space-y-4">
                                {/* Simple mismatches */}
                                {verification.mismatched_count > 0 && (
                                    <>
                                        <div className="flex items-center justify-between">
                                            <Badge variant="outline" className="gap-1">
                                                <AlertCircle className="h-3 w-3" />
                                                {verification.mismatched_count} correção(ões) simples
                                            </Badge>
                                            <div className="flex gap-2">
                                                <Button variant="outline" size="sm" onClick={handleSelectAll}>
                                                    {selectedFiles.length === verification.mismatched_files.length ? 'Desselecionar todos' : 'Selecionar todos'}
                                                </Button>
                                                <Button onClick={handleFixPdfs} disabled={selectedFiles.length === 0 || isFixing} className="gap-2" size="sm">
                                                    {isFixing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                                                    Corrigir Selecionados ({selectedFiles.length})
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="space-y-2 max-h-64 overflow-y-auto">
                                            {verification.mismatched_files.map((file) => (
                                                <div key={file.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedFiles.includes(file.id)}
                                                        onChange={() => setSelectedFiles(prev => prev.includes(file.id) ? prev.filter(id => id !== file.id) : [...prev, file.id])}
                                                        className="rounded"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-medium truncate">Atual: {file.current_filename}</div>
                                                        <div className="text-sm text-green-600 truncate">Esperado: {file.expected_filename}</div>
                                                        <div className="text-xs text-muted-foreground">{file.song_name} - {file.musical_key || 'Sem tom'} - {file.artist}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}

                                {/* Name conflicts */}
                                {(verification.conflicts?.length ?? 0) > 0 && (
                                    <div className="space-y-3 border-t pt-4">
                                        <div className="flex items-center gap-2">
                                            <Replace className="h-4 w-4 text-orange-500" />
                                            <h4 className="font-medium">Conflitos de Nome ({verification.conflicts.length})</h4>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Estes arquivos precisam ser renomeados, mas já existe outro arquivo com o nome esperado. Expanda para comparar e escolher qual manter.
                                        </p>
                                        <div className="space-y-3">
                                            {verification.conflicts.map((conflict, cIdx) => {
                                                const isExpanded = expandedConflict === cIdx
                                                const selectedId = selectedConflictFile[cIdx]
                                                const bothFiles = [conflict.file_to_fix, ...(conflict.conflicting_file ? [conflict.conflicting_file] : [])]

                                                return (
                                                    <div key={cIdx} className="border rounded-lg overflow-hidden">
                                                        <button
                                                            type="button"
                                                            className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left"
                                                            onClick={() => handleToggleConflict(cIdx, conflict)}
                                                        >
                                                            {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                                                            <span className="font-medium">{conflict.song_name || 'Sem título'}</span>
                                                            {conflict.artist && (
                                                                <Badge variant="secondary" className="text-xs gap-1"><User className="h-3 w-3" />{conflict.artist}</Badge>
                                                            )}
                                                            {conflict.musical_key && (
                                                                <Badge variant="outline" className="text-xs gap-1"><Music className="h-3 w-3" />{conflict.musical_key}</Badge>
                                                            )}
                                                            <Badge variant="destructive" className="text-xs ml-auto gap-1"><AlertCircle className="h-3 w-3" />Conflito</Badge>
                                                        </button>

                                                        {isExpanded && (
                                                            <div className="border-t px-4 pb-4 pt-3 space-y-4">
                                                                <p className="text-sm text-muted-foreground">
                                                                    Selecione a versão correta para manter. A outra será substituída nas listas e excluída.
                                                                </p>
                                                                <div className={`grid gap-4 ${bothFiles.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                                                                    {bothFiles.map((file) => {
                                                                        const isSelected = selectedId === file.id
                                                                        const isToFix = file.id === conflict.file_to_fix.id
                                                                        return (
                                                                            <label
                                                                                key={file.id}
                                                                                className={`relative flex flex-col border-2 rounded-lg p-3 cursor-pointer transition-colors ${isSelected ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/30'}`}
                                                                            >
                                                                                <div className="flex items-start gap-3 mb-3">
                                                                                    <input type="radio" name={`conflict-${cIdx}`} checked={isSelected} onChange={() => setSelectedConflictFile(prev => ({ ...prev, [cIdx]: file.id }))} className="mt-1" />
                                                                                    <div className="flex-1 min-w-0">
                                                                                        <div className="flex items-center gap-2">
                                                                                            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                                                                                            <span className="text-sm font-medium truncate">{file.filename}</span>
                                                                                        </div>
                                                                                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                                                                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(file.upload_date).toLocaleDateString('pt-BR')}</span>
                                                                                            <span>{(file.file_size / 1024).toFixed(1)} KB</span>
                                                                                            <Badge variant={isToFix ? "destructive" : "outline"} className="text-xs">{isToFix ? 'Nome incorreto' : 'Nome correto'}</Badge>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="w-full h-[300px] border rounded bg-muted/30">
                                                                                    {loadingPdfs[file.id] ? (
                                                                                        <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                                                                                    ) : pdfUrls[file.id] ? (
                                                                                        <iframe src={pdfUrls[file.id]} className="w-full h-full rounded" title={`Preview ${file.filename}`} />
                                                                                    ) : (
                                                                                        <div className="flex items-center justify-center h-full text-sm text-muted-foreground">Não foi possível carregar o preview</div>
                                                                                    )}
                                                                                </div>
                                                                            </label>
                                                                        )
                                                                    })}
                                                                </div>
                                                                <div className="flex justify-end pt-2">
                                                                    <Button onClick={() => handleResolveConflict(cIdx)} disabled={!selectedId || resolvingConflict === cIdx} className="gap-2">
                                                                        {resolvingConflict === cIdx ? <Loader2 className="h-4 w-4 animate-spin" /> : <Replace className="h-4 w-4" />}
                                                                        Substituir por selecionado
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        )}
                    </Card>
                )}

                {/* ============ SECTION 2: Duplicates ============ */}
                {dupIssues > 0 && (
                    <Card>
                        <CardHeader className="cursor-pointer" onClick={() => toggleSection('duplicates')}>
                            <CardTitle className="flex items-center gap-2">
                                {openSections.duplicates ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                                <Copy className="h-5 w-5" />
                                Duplicatas
                                <Badge variant="destructive" className="ml-2">{dupIssues} grupo(s)</Badge>
                            </CardTitle>
                            <CardDescription>
                                Músicas com mesmo título, artista e tom. Selecione a versão correta e substitua as demais.
                            </CardDescription>
                        </CardHeader>
                        {openSections.duplicates && (
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <Badge variant="outline" className="gap-1"><Copy className="h-3 w-3" />{duplicates.total_groups} grupo(s)</Badge>
                                    <Badge variant={duplicates.total_duplicate_files > 0 ? "destructive" : "outline"} className="gap-1">
                                        <FileText className="h-3 w-3" />{duplicates.total_duplicate_files} arquivo(s)
                                    </Badge>
                                </div>
                                <div className="space-y-3">
                                    {duplicates.groups.map((group, gIdx) => {
                                        const isExpanded = expandedGroup === gIdx
                                        const selectedId = selectedFilePerGroup[gIdx]
                                        return (
                                            <div key={gIdx} className="border rounded-lg overflow-hidden">
                                                <button
                                                    type="button"
                                                    className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left"
                                                    onClick={() => handleToggleGroup(gIdx, group.files)}
                                                >
                                                    {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                                                    <span className="font-medium">{group.song_name || 'Sem título'}</span>
                                                    {group.artist && <Badge variant="secondary" className="text-xs gap-1"><User className="h-3 w-3" />{group.artist}</Badge>}
                                                    {group.musical_key && <Badge variant="outline" className="text-xs gap-1"><Music className="h-3 w-3" />{group.musical_key}</Badge>}
                                                    <Badge variant="destructive" className="text-xs ml-auto">{group.files.length} cópias</Badge>
                                                </button>

                                                {isExpanded && (
                                                    <div className="border-t px-4 pb-4 pt-3 space-y-4">
                                                        <p className="text-sm text-muted-foreground">Selecione a versão correta para manter. As demais serão substituídas nas listas e excluídas.</p>
                                                        <div className={`grid gap-4 ${group.files.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                                                            {group.files.map((file, fIdx) => {
                                                                const isSelected = selectedId === file.id
                                                                return (
                                                                    <label
                                                                        key={file.id}
                                                                        className={`block border-2 rounded-lg p-3 cursor-pointer transition-colors ${isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/40'}`}
                                                                    >
                                                                        <div className="flex items-center gap-3 mb-3">
                                                                            <input type="radio" name={`duplicate-group-${gIdx}`} value={file.id} checked={isSelected} onChange={() => setSelectedFilePerGroup(prev => ({ ...prev, [gIdx]: file.id }))} className="h-4 w-4 accent-primary" />
                                                                            <div className="flex-1 min-w-0">
                                                                                <div className="text-sm font-medium truncate">{file.filename}</div>
                                                                                <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
                                                                                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(file.upload_date).toLocaleDateString('pt-BR')}</span>
                                                                                    <span>{(file.file_size / 1024).toFixed(1)} KB</span>
                                                                                    {fIdx === 0 && <Badge variant="outline" className="text-xs">Mais antigo</Badge>}
                                                                                </div>
                                                                            </div>
                                                                            {isSelected && (
                                                                                <Badge variant="default" className="text-xs shrink-0"><CheckCircle className="h-3 w-3 mr-1" />Manter</Badge>
                                                                            )}
                                                                        </div>
                                                                        <div className="border rounded bg-background">
                                                                            {loadingPdfs[file.id] ? (
                                                                                <div className="flex items-center justify-center h-[300px] text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>
                                                                            ) : pdfUrls[file.id] ? (
                                                                                <iframe src={pdfUrls[file.id]} className="w-full h-[300px] rounded" title={`Preview - ${file.filename}`} />
                                                                            ) : (
                                                                                <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">Não foi possível carregar o preview</div>
                                                                            )}
                                                                        </div>
                                                                    </label>
                                                                )
                                                            })}
                                                        </div>
                                                        <div className="flex justify-end pt-2">
                                                            <Button onClick={() => handleReplaceDuplicates(gIdx)} disabled={!selectedId || replacingGroup === gIdx} className="gap-2">
                                                                {replacingGroup === gIdx ? <Loader2 className="h-4 w-4 animate-spin" /> : <Replace className="h-4 w-4" />}
                                                                {replacingGroup === gIdx ? 'Substituindo...' : `Substituir por selecionado (${group.files.length - 1} arquivo(s))`}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </CardContent>
                        )}
                    </Card>
                )}

                {/* ============ SECTION 3: Legacy Files ============ */}
                {legacyIssues > 0 && (
                    <Card>
                        <CardHeader className="cursor-pointer" onClick={() => toggleSection('legacy')}>
                            <CardTitle className="flex items-center gap-2">
                                {openSections.legacy ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                                <FolderSync className="h-5 w-5" />
                                Arquivos Legados
                                <Badge variant="secondary" className="ml-2 border-orange-500 text-orange-600">{legacyIssues}</Badge>
                            </CardTitle>
                            <CardDescription>
                                Arquivos antigos que não foram migrados para o subdiretório do workspace
                            </CardDescription>
                        </CardHeader>
                        {openSections.legacy && (
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4 flex-wrap">
                                        <Badge variant="outline" className="gap-1"><HardDrive className="h-3 w-3" />{legacyFiles.total_size_mb} MB total</Badge>
                                        <Badge variant="destructive" className="gap-1"><Copy className="h-3 w-3" />{legacyFiles.duplicate_count} duplicado(s)</Badge>
                                        {legacyFiles.unique_count > 0 && (
                                            <Badge variant="secondary" className="gap-1 border-orange-500 text-orange-600"><ArrowRight className="h-3 w-3" />{legacyFiles.unique_count} a mover</Badge>
                                        )}
                                    </div>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button onClick={handleCleanupLegacyFiles} disabled={isCleaning} variant="destructive" className="gap-2">
                                                {isCleaning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                {isCleaning ? 'Limpando...' : 'Executar Limpeza'}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Duplicados serão excluídos e arquivos únicos serão movidos para o workspace</TooltipContent>
                                    </Tooltip>
                                </div>

                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {legacyFiles.legacy_directories.map((dir) => (
                                        <div key={dir.directory} className="border rounded-lg p-3">
                                            <div className="flex items-center gap-2 mb-2">
                                                <FileText className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-medium text-sm">{dir.directory}/</span>
                                                <Badge variant="outline" className="text-xs">{dir.file_count} arquivo(s)</Badge>
                                            </div>
                                            <div className="space-y-1 pl-6">
                                                {dir.files.map((file) => (
                                                    <div key={file.relative_path} className="flex items-center gap-2 text-xs">
                                                        {file.is_duplicate ? (
                                                            <Trash2 className="h-3 w-3 text-destructive shrink-0" />
                                                        ) : (
                                                            <ArrowRight className="h-3 w-3 text-orange-500 shrink-0" />
                                                        )}
                                                        <span className="truncate text-muted-foreground">{file.filename}</span>
                                                        <span className="text-muted-foreground shrink-0">({(file.size / 1024).toFixed(1)} KB)</span>
                                                        <Badge variant={file.is_duplicate ? "destructive" : "secondary"} className="text-[10px] px-1.5 shrink-0">
                                                            {file.is_duplicate ? 'Excluir' : 'Mover'}
                                                        </Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <p className="text-xs text-muted-foreground">
                                    <strong>Excluir:</strong> arquivo já existe em <code>organized/igreja/</code> (duplicado).{' '}
                                    <strong>Mover:</strong> arquivo será movido para <code>organized/igreja/</code>.
                                </p>
                            </CardContent>
                        )}
                    </Card>
                )}

                {/* All clear message */}
                {totalIssues === 0 && (
                    <Card>
                        <CardContent className="py-12">
                            <div className="text-center text-muted-foreground">
                                <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
                                <h2 className="text-xl font-semibold mb-2 text-foreground">Tudo correto!</h2>
                                <p>Todos os {verification.total_files} arquivos estão com nomes corretos, sem duplicatas e no diretório correto.</p>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </MainLayout>
    )
}
