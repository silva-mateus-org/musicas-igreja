'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@core/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@core/components/ui/card'
import { Label } from '@core/components/ui/label'
import { Input } from '@core/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@core/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@core/components/ui/tabs'
import { ArrowLeft, Loader2, Save, Download } from 'lucide-react'
import { useToast } from '@core/hooks/use-toast'
import { useAuth } from '@core/contexts/auth-context'
import { ChordEditor } from '@/components/music/chord-editor'
import { ChordPreview } from '@/components/music/chord-preview'
import { TranspositionControls } from '@/components/music/transposition-controls'
import type { MusicFile, UpdateChordContentDto } from '@/types'
import { musicApi, downloadFile } from '@/lib/api'
import { useMusicDetail } from '@/hooks/use-music'
import { LoadingOverlay } from '@/components/ui/loading-spinner'
import Link from 'next/link'

const MUSICAL_KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export default function ChordEditorPage() {
    const params = useParams()
    const router = useRouter()
    const { toast } = useToast()
    const { hasPermission } = useAuth()
    const canEdit = hasPermission('music:edit_metadata') || hasPermission('lists:manage')

    const musicId = parseInt(params.id as string)
    const { data: music, isLoading, error: queryError } = useMusicDetail(musicId)

    const [loading, setLoading] = useState(false)
    const [isDirty, setIsDirty] = useState(false)
    const [chordContent, setChordContent] = useState('')
    const [musicalKey, setMusicalKey] = useState('C')
    const [previewKey, setPreviewKey] = useState('C')

    useEffect(() => {
        if (music) {
            if (!music.chord_content) {
                toast({
                    title: 'Erro',
                    description: 'Esta música não é do tipo cifra',
                    variant: 'destructive',
                })
                router.push(`/music/${musicId}`)
                return
            }
            setChordContent(music.chord_content)
            setMusicalKey(music.musical_key || 'C')
            setPreviewKey(music.musical_key || 'C')
        }
    }, [music])

    useEffect(() => {
        if (queryError) {
            toast({
                title: 'Erro',
                description: (queryError as Error).message,
                variant: 'destructive',
            })
            router.push('/music')
        }
    }, [queryError])

    if (!canEdit) {
        return (
            <MainLayout>
                <div className="p-6">
                    <p className="text-red-600">Sem permissão para editar músicas.</p>
                </div>
            </MainLayout>
        )
    }

    if (isLoading) {
        return (
            <MainLayout>
                <LoadingOverlay message="Carregando música..." />
            </MainLayout>
        )
    }

    if (!music) {
        return (
            <MainLayout>
                <div className="p-6">
                    <p className="text-red-600">Música não encontrada.</p>
                </div>
            </MainLayout>
        )
    }

    const handleSave = async () => {
        if (!chordContent.trim()) {
            toast({
                title: 'Erro',
                description: 'Conteúdo de cifra não pode estar vazio',
                variant: 'destructive',
            })
            return
        }

        try {
            setLoading(true)

            const dto: UpdateChordContentDto = {
                chord_content: chordContent,
                musical_key: musicalKey,
            }

            await musicApi.updateChord(musicId, dto)

            setIsDirty(false)
            toast({
                title: 'Sucesso',
                description: 'Cifra atualizada com sucesso',
            })

            router.push(`/music/${musicId}`)
        } catch (error) {
            console.error('Error saving chord content:', error)
            toast({
                title: 'Erro',
                description: error instanceof Error ? error.message : 'Falha ao salvar cifra',
                variant: 'destructive',
            })
        } finally {
            setLoading(false)
        }
    }

    const handleExport = async (useCapo: boolean) => {
        try {
            setLoading(true)
            const capoFret = previewKey !== musicalKey
                ? ((MUSICAL_KEYS.indexOf(previewKey) - MUSICAL_KEYS.indexOf(musicalKey) + 12) % 12)
                : 0
            const blob = await musicApi.exportChordPdf(musicId, {
                transposed_key: previewKey,
                use_capo: useCapo,
                capo_fret: useCapo ? capoFret : undefined,
            })
            const name = (music?.title || music?.filename || 'cifra') + '.pdf'
            downloadFile(blob, name)
        } catch (error) {
            toast({
                title: 'Erro',
                description: error instanceof Error ? error.message : 'Falha ao exportar PDF',
                variant: 'destructive',
            })
        } finally {
            setLoading(false)
        }
    }

    const handleSaveAsDefaultKey = async () => {
        try {
            setLoading(true)

            const dto: UpdateChordContentDto = {
                chord_content: chordContent,
                musical_key: previewKey,
            }

            await musicApi.updateChord(musicId, dto)

            setMusicalKey(previewKey)
            toast({
                title: 'Sucesso',
                description: `Tom padrão salvo como ${previewKey}`,
            })
        } catch (error) {
            console.error('Error saving default key:', error)
            toast({
                title: 'Erro',
                description: error instanceof Error ? error.message : 'Falha ao salvar tom padrão',
                variant: 'destructive',
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <MainLayout>
            <div className="space-y-6 p-6">
                <div className="flex items-center gap-4">
                    <Link href={`/music/${musicId}`}>
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Voltar
                        </Button>
                    </Link>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold">Editar Cifra</h1>
                        <p className="text-sm text-muted-foreground">{music.filename || music.original_name}</p>
                    </div>
                </div>

                <Tabs defaultValue="editor" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="editor">Editor</TabsTrigger>
                        <TabsTrigger value="preview">Visualização</TabsTrigger>
                    </TabsList>

                    <TabsContent value="editor" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Tom Padrão</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="default-key">Tom da música:</Label>
                                    <Select value={musicalKey} onValueChange={setMusicalKey}>
                                        <SelectTrigger className="w-24">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {MUSICAL_KEYS.map((key) => (
                                                <SelectItem key={key} value={key}>
                                                    {key}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>

                        <ChordEditor
                            value={chordContent}
                            onChange={(content) => {
                                setChordContent(content)
                                setIsDirty(true)
                            }}
                        />
                    </TabsContent>

                    <TabsContent value="preview" className="space-y-4">
                        <TranspositionControls
                            originalKey={musicalKey}
                            transposedKey={previewKey}
                            onKeyChange={setPreviewKey}
                            onCapoChange={() => {}}
                            showCapoIndicator={true}
                        />
                        <ChordPreview
                            chordContent={chordContent}
                            transposedKey={previewKey}
                            capoFret={previewKey !== musicalKey ? ((MUSICAL_KEYS.indexOf(previewKey) - MUSICAL_KEYS.indexOf(musicalKey) + 12) % 12) : undefined}
                        />
                    </TabsContent>
                </Tabs>

                <div className="flex flex-wrap justify-end gap-2">
                    <Link href={`/music/${musicId}`}>
                        <Button variant="outline" disabled={loading}>
                            Cancelar
                        </Button>
                    </Link>

                    <Button variant="outline" onClick={() => handleExport(true)} disabled={loading}>
                        <Download className="w-4 h-4 mr-2" />
                        Exportar com Capo
                    </Button>

                    <Button variant="outline" onClick={() => handleExport(false)} disabled={loading}>
                        <Download className="w-4 h-4 mr-2" />
                        Exportar Convertido
                    </Button>

                    {previewKey !== musicalKey && (
                        <Button
                            variant="secondary"
                            onClick={handleSaveAsDefaultKey}
                            disabled={loading}
                        >
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Salvar Tom {previewKey} como Padrão
                        </Button>
                    )}

                    <Button onClick={handleSave} disabled={loading || !isDirty}>
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        <Save className="w-4 h-4 mr-2" />
                        Salvar Cifra
                    </Button>
                </div>
            </div>
        </MainLayout>
    )
}
