'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@core/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@core/components/ui/card'
import { Input } from '@core/components/ui/input'
import { Label } from '@core/components/ui/label'
import { Textarea } from '@core/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@core/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@core/components/ui/tabs'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { useToast } from '@core/hooks/use-toast'
import { useAuth } from '@core/contexts/auth-context'
import { ChordEditor } from '@/components/music/chord-editor'
import { ChordPreview } from '@/components/music/chord-preview'
import { TranspositionControls } from '@/components/music/transposition-controls'
import type { CreateChordSongDto } from '@/types'
import { musicApi } from '@/lib/api'
import Link from 'next/link'

const MUSICAL_KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export default function NewChordPage() {
    const router = useRouter()
    const { toast } = useToast()
    const { hasPermission } = useAuth()

    const canCreate = hasPermission('music:upload')

    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        song_name: '',
        artist: '',
        musical_key: 'C',
        chord_content: '',
        youtube_link: '',
        description: '',
    })

    const [previewKey, setPreviewKey] = useState('C')

    if (!canCreate) {
        return (
            <MainLayout>
                <div className="p-6">
                    <p className="text-red-600">Sem permissão para criar músicas.</p>
                </div>
            </MainLayout>
        )
    }

    const handleChange = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.song_name.trim()) {
            toast({ title: 'Erro', description: 'Nome da música é obrigatório', variant: 'destructive' })
            return
        }

        if (!formData.chord_content.trim()) {
            toast({ title: 'Erro', description: 'Conteúdo de cifra é obrigatório', variant: 'destructive' })
            return
        }

        try {
            setLoading(true)

            const dto: CreateChordSongDto = {
                song_name: formData.song_name,
                artist: formData.artist || undefined,
                musical_key: formData.musical_key || undefined,
                chord_content: formData.chord_content,
                youtube_link: formData.youtube_link || undefined,
                description: formData.description || undefined,
            }

            const result = await musicApi.createChord(dto)
            if (result.file_id) {
                toast({ title: 'Sucesso', description: 'Música criada com sucesso' })
                router.push(`/music/${result.file_id}`)
            } else {
                toast({ title: 'Erro', description: 'Falha ao criar música', variant: 'destructive' })
            }
        } catch (error) {
            console.error('Error creating chord song:', error)
            toast({
                title: 'Erro',
                description: error instanceof Error ? error.message : 'Falha ao criar música',
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
                    <Link href="/music">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Voltar
                        </Button>
                    </Link>
                    <PageHeader title="Nova Música - Formato Cifra" description="Crie uma música em formato ChordPro" />
                    <Link
                        href="/upload"
                        className="ml-auto text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                    >
                        Prefere fazer upload de PDF? →
                    </Link>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Informações da Música</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="song_name">Nome da Música *</Label>
                                    <Input
                                        id="song_name"
                                        value={formData.song_name}
                                        onChange={(e) => handleChange('song_name', e.target.value)}
                                        placeholder="ex: Aleluia"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="artist">Artista</Label>
                                    <Input
                                        id="artist"
                                        value={formData.artist}
                                        onChange={(e) => handleChange('artist', e.target.value)}
                                        placeholder="ex: Bach"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="key">Tom Padrão</Label>
                                    <Select value={formData.musical_key} onValueChange={(v) => handleChange('musical_key', v)}>
                                        <SelectTrigger>
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

                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="youtube">Link YouTube</Label>
                                    <Input
                                        id="youtube"
                                        type="url"
                                        value={formData.youtube_link}
                                        onChange={(e) => handleChange('youtube_link', e.target.value)}
                                        placeholder="https://www.youtube.com/watch?v=..."
                                    />
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="description">Observações</Label>
                                    <Textarea
                                        id="description"
                                        value={formData.description}
                                        onChange={(e) => handleChange('description', e.target.value)}
                                        placeholder="Notas extras sobre a música"
                                        rows={3}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Tabs defaultValue="editor" className="space-y-4">
                        <TabsList>
                            <TabsTrigger value="editor">Editor</TabsTrigger>
                            <TabsTrigger value="preview">Visualização</TabsTrigger>
                        </TabsList>

                        <TabsContent value="editor" className="space-y-4">
                            <ChordEditor
                                value={formData.chord_content}
                                onChange={(content) => handleChange('chord_content', content)}
                            />
                        </TabsContent>

                        <TabsContent value="preview" className="space-y-4">
                            <TranspositionControls
                                originalKey={formData.musical_key}
                                transposedKey={previewKey}
                                onKeyChange={setPreviewKey}
                                onCapoChange={() => {}}
                            />
                            <ChordPreview
                                chordContent={formData.chord_content}
                                transposedKey={previewKey}
                                capoFret={0}
                            />
                        </TabsContent>
                    </Tabs>

                    <div className="flex justify-end gap-2">
                        <Link href="/music">
                            <Button variant="outline">Cancelar</Button>
                        </Link>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Criar Música
                        </Button>
                    </div>
                </form>
            </div>
        </MainLayout>
    )
}
