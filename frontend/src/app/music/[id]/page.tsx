'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@core/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@core/components/ui/card'
import { Badge } from '@core/components/ui/badge'
import { ArrowLeft, Download, Edit, Trash2, ExternalLink, Music, User, Tag, Calendar, PlayCircle, Eye, Plus, RefreshCw, MoreVertical, Info } from 'lucide-react'
import { useToast } from '@core/hooks/use-toast'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@core/components/ui/tooltip'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@core/components/ui/dropdown-menu'
import Link from 'next/link'
import { useAuth } from '@core/contexts/auth-context'
import type { MusicFile as MusicType } from '@/types'
import { musicApi, handleApiError } from '@/lib/api'
import { useMusicDetail } from '@/hooks/use-music'
import { AddToListModal } from '@/components/music/add-to-list-modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { LoadingOverlay } from '@/components/ui/loading-spinner'
import { InstructionsModal, PAGE_INSTRUCTIONS } from '@/components/ui/instructions-modal'
import { ChordPreview } from '@/components/music/chord-preview'
import { OcrConvertCard } from '@/components/music/ocr-convert-card'
import { TranspositionControls } from '@/components/music/transposition-controls'
import { parseChordProDocument } from '@/lib/chordpro'
import { MusicDisplaySettings } from '@/components/music/display-settings'

function isValidYouTube(url?: string) {
    if (!url) return false
    try {
        const u = new URL(url)
        return u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')
    } catch {
        return false
    }
}

export default function MusicDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const { toast } = useToast()
    const { hasPermission } = useAuth()
    const canEdit = hasPermission('music:edit_metadata') || hasPermission('lists:manage')
    const canDelete = hasPermission('music:delete')
    const canManageLists = hasPermission('lists:manage')

    const musicId = parseInt(params.id as string)
    const { data: music, isLoading: loading, error: queryError } = useMusicDetail(musicId)

    const [pdfError, setPdfError] = useState(false)
    const [pdfUrl, setPdfUrl] = useState<string | null>(null)
    const [loadingPdf, setLoadingPdf] = useState(true)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    
    // User Preferences State
    const [userPrefKey, setUserPrefKey] = useState<string | null>(null)
    const [userPrefCapo, setUserPrefCapo] = useState<number>(0)
    const [userArrangement, setUserArrangement] = useState<string | null>(null)
    const [isSavingPref, setIsSavingPref] = useState(false)
    const [isEditArrangement, setIsEditArrangement] = useState(false)
    const [showFileInfo, setShowFileInfo] = useState(false)

    // Display Settings State
    const [fontSize, setFontSize] = useState(16)
    const [showChords, setShowChords] = useState(true)
    const [chordColor, setChordColor] = useState('text-primary')
    const [columnView, setColumnView] = useState(false)

    // Load preferences
    useEffect(() => {
        if (!music || music.content_type !== 'chord') return;
        
        const fetchPreferences = async () => {
            try {
                const res = await fetch(`/api/files/${music.id}/preferences`)
                if (res.ok) {
                    const data = await res.json()
                    if (data.success && data.preferences) {
                        const originalKeyMatch = music.chord_content?.match(/^\{key:\s*([A-G][#b]?)\}/m) || music.chord_content?.match(/^\{k:\s*([A-G][#b]?)\}/m)
                        const originalKey = originalKeyMatch ? originalKeyMatch[1] : 'C'
                        
                        const MUSICAL_KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
                        const originalIndex = MUSICAL_KEYS.indexOf(originalKey)
                        const prefTranspose = data.preferences.transposeAmount || 0
                        
                        if (originalIndex !== -1) {
                            const newIndex = (originalIndex + prefTranspose) % 12
                            setUserPrefKey(MUSICAL_KEYS[newIndex < 0 ? newIndex + 12 : newIndex])
                        } else {
                            setUserPrefKey(music.musical_key || 'C')
                        }
                        
                        setUserPrefCapo(data.preferences.capoFret || 0)
                        setUserArrangement(data.preferences.arrangementJson || null)
                    }
                }
            } catch (err) {
                console.error("Failed to load user preferences", err)
            }
        }
        
        fetchPreferences()
    }, [music])

    // Save preferences
    const savePreferences = async (newKey: string, newCapo: number, newArrangement: string | null) => {
        if (!music) return;
        try {
            setIsSavingPref(true)
            const MUSICAL_KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
            
            const originalKeyMatch = music.chord_content?.match(/^\{key:\s*([A-G][#b]?)\}/m) || music.chord_content?.match(/^\{k:\s*([A-G][#b]?)\}/m)
            const originalKey = originalKeyMatch ? originalKeyMatch[1] : 'C'
            
            const originalIndex = MUSICAL_KEYS.indexOf(originalKey)
            const newIndex = MUSICAL_KEYS.indexOf(newKey)
            
            let transposeAmount = 0
            if (originalIndex !== -1 && newIndex !== -1) {
                transposeAmount = (newIndex - originalIndex + 12) % 12
            }
            
            await fetch(`/api/files/${music.id}/preferences`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transposeAmount,
                    capoFret: newCapo,
                    arrangementJson: newArrangement
                })
            })
            
            setUserPrefKey(newKey)
            setUserPrefCapo(newCapo)
            setUserArrangement(newArrangement)
        } catch (err) {
            console.error("Failed to save user preferences", err)
            toast({ title: 'Erro', description: 'NÃ£o foi possÃ­vel salvar suas preferÃªncias.', variant: 'destructive' })
        } finally {
            setIsSavingPref(false)
        }
    }

    useEffect(() => {
        if (music?.id && music.content_type !== 'chord') {
            loadPdf(music.id)
        }
    }, [music?.id, music?.content_type])

    useEffect(() => {
        if (queryError) {
            toast({ title: 'Erro', description: (queryError as Error).message, variant: 'destructive' })
            router.push('/music')
        }
    }, [queryError, toast, router])

    const loadPdf = async (fileId: number) => {
        try {
            setLoadingPdf(true)
            setPdfError(false)

            const response = await fetch(`/api/files/${fileId}/stream`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/pdf',
                },
                cache: 'no-store'
            })

            if (!response.ok) {
                const errorText = await response.text()
                console.error('[Music] Error response:', errorText)
                throw new Error(`Falha ao carregar PDF: ${response.status} ${response.statusText}`)
            }

            const blob = await response.blob()
            const url = URL.createObjectURL(blob)
            setPdfUrl(url)
        } catch (error) {
            console.error('[Music] Error loading PDF:', error)
            setPdfError(true)
        } finally {
            setLoadingPdf(false)
        }
    }

    // Cleanup do blob URL quando o componente desmontar
    useEffect(() => {
        return () => {
            if (pdfUrl) {
                URL.revokeObjectURL(pdfUrl)
            }
        }
    }, [pdfUrl])

    const handleDownload = async () => {
        if (!music) return
        try {
            const blob = await musicApi.downloadMusic(music.id)
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = music.original_name
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(url)
            toast({ title: 'Download concluÃ­do', description: `Arquivo ${music.original_name} baixado com sucesso` })
        } catch (error) {
            toast({ title: 'Erro', description: handleApiError(error), variant: 'destructive' })
        }
    }

    const handleDeleteClick = () => {
        setDeleteDialogOpen(true)
    }

    const handleDeleteConfirm = async () => {
        if (!music) return
        try {
            setIsDeleting(true)
            await musicApi.deleteMusic(music.id)
            toast({ title: 'MÃºsica excluÃ­da', description: 'A mÃºsica foi removida com sucesso' })
            router.push('/music')
        } catch (error) {
            toast({ title: 'Erro', description: handleApiError(error), variant: 'destructive' })
        } finally {
            setIsDeleting(false)
        }
    }

    if (loading) {
        return (
            <MainLayout>
                <LoadingOverlay message="Carregando mÃºsica..." />
            </MainLayout>
        )
    }

    if (!music) return null

    return (
        <MainLayout>
            <div className="space-y-4">
                {/* Compact Song Header â€” Songbook Pro inspired */}
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                        <span className="sr-only">Voltar</span>
                    </Button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-xl sm:text-2xl font-bold truncate">{music.title}</h1>
                        {music.artist && (
                            <p className="text-sm text-muted-foreground truncate">{music.artist}</p>
                        )}
                    </div>
                    {music.musical_key && (
                        <Badge variant="outline" className="text-sm shrink-0">
                            Tom: {music.musical_key}
                        </Badge>
                    )}

                    {/* Display Settings */}
                    {music.content_type === 'chord' && (
                        <MusicDisplaySettings
                            fontSize={fontSize}
                            setFontSize={setFontSize}
                            showChords={showChords}
                            setShowChords={setShowChords}
                            chordColor={chordColor}
                            setChordColor={setChordColor}
                            columnView={columnView}
                            setColumnView={setColumnView}
                        />
                    )}

                    {/* Overflow menu for secondary actions */}
                    <TooltipProvider>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9">
                                    <MoreVertical className="h-5 w-5" />
                                    <span className="sr-only">Mais aÃ§Ãµes</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                                <DropdownMenuItem onClick={() => window.open(`/api/files/${music.id}/stream`, '_blank')}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    Visualizar PDF
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDownload}>
                                    <Download className="h-4 w-4 mr-2" />
                                    Download
                                </DropdownMenuItem>
                                {canEdit && (
                                    <DropdownMenuItem asChild>
                                        <Link href={music.content_type === 'chord' ? `/music/${music.id}/chord` : `/music/${music.id}/edit`}>
                                            <Edit className="h-4 w-4 mr-2" />
                                            {music.content_type === 'chord' ? 'Editar Cifra' : 'Editar'}
                                        </Link>
                                    </DropdownMenuItem>
                                )}
                                {canManageLists && (
                                    <AddToListModal
                                        musicId={music.id}
                                        musicTitle={music.title || music.original_name}
                                        trigger={
                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                <Plus className="h-4 w-4 mr-2" />
                                                Adicionar Ã  lista
                                            </DropdownMenuItem>
                                        }
                                    />
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setShowFileInfo(!showFileInfo)}>
                                    <Info className="h-4 w-4 mr-2" />
                                    {showFileInfo ? 'Ocultar informaÃ§Ãµes' : 'InformaÃ§Ãµes do arquivo'}
                                </DropdownMenuItem>
                                {canDelete && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleDeleteClick}>
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Excluir
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TooltipProvider>
                </div>

                {/* Tags row â€” compact */}
                {((music.categories && music.categories.length > 0) || music.category || (music.custom_filters && Object.keys(music.custom_filters).length > 0)) && (
                    <div className="flex flex-wrap gap-1.5 px-1">
                        {music.categories && music.categories.length > 0 ? (
                            music.categories.map((cat, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                    {cat}
                                </Badge>
                            ))
                        ) : music.category ? (
                            <Badge variant="secondary" className="text-xs">{music.category}</Badge>
                        ) : null}
                        {music.custom_filters && Object.entries(music.custom_filters).map(([slug, group]) =>
                            group.values.map((val, idx) => (
                                <Badge key={`${slug}-${idx}`} variant="outline" className="text-xs">{val}</Badge>
                            ))
                        )}
                    </div>
                )}

                {/* Main content area */}
                {music.content_type === 'chord' && music.chord_content ? (
                    <div className="space-y-3">
                        {/* Compact transposition bar â€” Songbook Pro "Principais ajustes" style */}
                        <TranspositionControls
                            originalKey={music.musical_key || 'C'}
                            transposedKey={userPrefKey || music.musical_key || 'C'}
                            capoFret={userPrefCapo}
                            showCapoIndicator={true}
                            onKeyChange={(k) => savePreferences(k, userPrefCapo, userArrangement)}
                            onCapoChange={(c) => savePreferences(userPrefKey || music.musical_key || 'C', c, userArrangement)}
                        />

                        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground self-start"
                            onClick={() => setIsEditArrangement(!isEditArrangement)}>
                            {isEditArrangement ? 'â–¾ Fechar Arranjo' : 'â–¸ Editar Arranjo'}
                        </Button>

                        {isEditArrangement && (
                            <div className="bg-muted p-4 rounded-md border border-border">
                                <h3 className="font-semibold text-sm mb-2">Montador de Arranjo</h3>
                                <p className="text-xs text-muted-foreground mb-3">Adicione e reordene as partes.</p>
                                <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                                    {parseChordProDocument(music.chord_content).sections.map(sec => (
                                        sec.label && sec.type !== 'other' && (
                                            <Button key={sec.id} variant="outline" size="sm" onClick={() => {
                                                const arr = userArrangement ? JSON.parse(userArrangement) : parseChordProDocument(music.chord_content!).sections.map(s => s.id)
                                                savePreferences(userPrefKey || music.musical_key || 'C', userPrefCapo, JSON.stringify([...arr, sec.id]))
                                            }}>+ {sec.label}</Button>
                                        )
                                    ))}
                                    <Button variant="ghost" size="sm" className="text-destructive"
                                        onClick={() => savePreferences(userPrefKey || music.musical_key || 'C', userPrefCapo, null)}>Resetar</Button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {(userArrangement ? JSON.parse(userArrangement) : parseChordProDocument(music.chord_content).sections.map(s => s.id)).map((secId: string, idx: number) => {
                                        const sec = parseChordProDocument(music.chord_content!).sections.find(s => s.id === secId || s.label === secId)
                                        if (!sec) return null
                                        return (
                                            <div key={`${secId}-${idx}`} className="flex items-center bg-card border border-border rounded px-3 py-1">
                                                <span className="text-sm font-medium">{sec.label || 'SeÃ§Ã£o'}</span>
                                                <button onClick={() => {
                                                    const arr = userArrangement ? JSON.parse(userArrangement) : parseChordProDocument(music.chord_content!).sections.map(s => s.id)
                                                    const n = [...arr]; n.splice(idx, 1)
                                                    savePreferences(userPrefKey || music.musical_key || 'C', userPrefCapo, JSON.stringify(n))
                                                }} className="ml-2 text-muted-foreground hover:text-destructive cursor-pointer">&times;</button>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        <ChordPreview
                            chordContent={music.chord_content}
                            transposedKey={userPrefKey || music.musical_key || 'C'}
                            capoFret={userPrefCapo}
                            arrangementJson={userArrangement || undefined}
                            fontSize={fontSize}
                            showChords={showChords}
                            chordColor={chordColor}
                            columnView={columnView}
                        />
                    </div>
                ) : (
                    <div className="rounded-lg overflow-hidden border border-border">
                        {loadingPdf ? (
                            <div className="w-full h-[80vh] flex items-center justify-center bg-muted">
                                <LoadingOverlay message="Carregando PDF..." />
                            </div>
                        ) : pdfError ? (
                            <div className="w-full h-[80vh] flex items-center justify-center bg-muted">
                                <div className="text-center">
                                    <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                    <p className="text-muted-foreground mb-2">NÃ£o foi possÃ­vel carregar o PDF</p>
                                    <div className="flex gap-2 justify-center">
                                        <Button variant="outline" onClick={() => loadPdf(music.id)} className="gap-2">
                                            <RefreshCw className="h-4 w-4" /> Tentar novamente
                                        </Button>
                                        <Button variant="outline" onClick={() => window.open(`/api/files/${music.id}/stream`, '_blank')} className="gap-2">
                                            <Eye className="h-4 w-4" /> Abrir em nova aba
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ) : pdfUrl ? (
                            <iframe src={pdfUrl} className="w-full h-[80vh]" title="PDF" />
                        ) : (
                            <div className="w-full h-[80vh] flex items-center justify-center bg-muted">
                                <p className="text-muted-foreground">PDF nÃ£o disponÃ­vel</p>
                            </div>
                        )}
                    </div>
                )}

                {(music.content_type === 'pdf_only' || music.content_type === 'chord_converting') && (
                    <OcrConvertCard musicId={music.id} contentType={music.content_type} ocrStatus={music.ocr_status} canConvert={canEdit} />
                )}

                {showFileInfo && (
                    <Card>
                        <CardHeader className="py-3"><CardTitle className="text-base">InformaÃ§Ãµes do Arquivo</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <span className="font-medium">Arquivo:</span>
                                <span className="text-muted-foreground break-all">{music.original_name}</span>
                                <span className="font-medium">Tamanho:</span>
                                <span className="text-muted-foreground">{(music.file_size / 1024).toFixed(2)} KB</span>
                                <span className="font-medium">PÃ¡ginas:</span>
                                <span className="text-muted-foreground">{music.pages}</span>
                                <span className="font-medium">Upload:</span>
                                <span className="text-muted-foreground">{new Date(music.upload_date).toLocaleDateString('pt-BR')}</span>
                            </div>
                            {music.youtube_link && (
                                <a href={music.youtube_link} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                                    <ExternalLink className="h-3 w-3" /> Abrir no YouTube
                                </a>
                            )}
                        </CardContent>
                    </Card>
                )}

                {isValidYouTube(music.youtube_link) && (
                    <div className="rounded-lg overflow-hidden aspect-video border border-border">
                        <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${new URL(music.youtube_link!).searchParams.get('v') || ''}`} title="YouTube" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
                    </div>
                )}
            </div>

            <ConfirmDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                title="Confirmar ExclusÃ£o"
                description={`Tem certeza que deseja excluir "${music?.title || 'esta mÃºsica'}"?`}
                confirmText="Excluir"
                cancelText="Cancelar"
                variant="destructive"
                onConfirm={handleDeleteConfirm}
                loading={isDeleting}
            />
        </MainLayout>
    )
}
