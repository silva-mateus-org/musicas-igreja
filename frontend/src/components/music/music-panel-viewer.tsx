'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Badge } from '@core/components/ui/badge'
import { Button } from '@core/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@core/components/ui/dropdown-menu'
import {
  Download,
  Edit,
  ExternalLink,
  Eye,
  Loader2,
  MoreVertical,
  Music2,
  Plus,
  RefreshCw,
} from 'lucide-react'
import { useAuth } from '@core/contexts/auth-context'
import { musicApi, handleApiError } from '@/lib/api'
import { useMusicDetail } from '@/hooks/use-music'
import { useMusicDisplayPrefs } from '@/hooks/use-music-display-prefs'
import { ChordPreview } from '@/components/music/chord-preview'
import { TranspositionControls } from '@/components/music/transposition-controls'
import { MusicDisplaySettings } from '@/components/music/display-settings'
import { AddToListModal } from '@/components/music/add-to-list-modal'
import { OcrConvertCard } from '@/components/music/ocr-convert-card'
import { parseChordProDocument } from '@/lib/chordpro'
import { useToast } from '@core/hooks/use-toast'

const MUSICAL_KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

interface MusicPanelViewerProps {
  musicId: number
}

export function MusicPanelViewer({ musicId }: MusicPanelViewerProps) {
  const { toast } = useToast()
  const { hasPermission } = useAuth()
  const canEdit = hasPermission('music:edit_metadata') || hasPermission('lists:manage')
  const canManageLists = hasPermission('lists:manage')

  const { data: music, isLoading, error } = useMusicDetail(musicId)

  const [prefs, updatePrefs] = useMusicDisplayPrefs()

  // Per-song server preferences (transpose/capo/arrangement)
  const [transposedKey, setTransposedKey] = useState<string | null>(null)
  const [capoFret, setCapoFret] = useState(0)
  const [arrangementJson, setArrangementJson] = useState<string | null>(null)
  const [isSavingPref, setIsSavingPref] = useState(false)

  // PDF state
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [loadingPdf, setLoadingPdf] = useState(true)
  const [pdfError, setPdfError] = useState(false)

  // Load per-song preferences from server when music changes
  useEffect(() => {
    if (!music || music.content_type !== 'chord') {
      setTransposedKey(null)
      setCapoFret(0)
      setArrangementJson(null)
      return
    }

    const load = async () => {
      try {
        const res = await fetch(`/api/files/${music.id}/preferences`)
        if (res.ok) {
          const data = await res.json()
          if (data.success && data.preferences) {
            const originalKeyMatch =
              music.chord_content?.match(/^\{key:\s*([A-G][#b]?)\}/m) ||
              music.chord_content?.match(/^\{k:\s*([A-G][#b]?)\}/m)
            const originalKey = originalKeyMatch?.[1] ?? 'C'
            const originalIndex = MUSICAL_KEYS.indexOf(originalKey)
            const transposeAmount = data.preferences.transposeAmount || 0
            if (originalIndex !== -1) {
              const newIndex = (originalIndex + transposeAmount + 12) % 12
              setTransposedKey(MUSICAL_KEYS[newIndex])
            } else {
              setTransposedKey(music.musical_key || 'C')
            }
            setCapoFret(data.preferences.capoFret || 0)
            setArrangementJson(data.preferences.arrangementJson || null)
          } else {
            setTransposedKey(music.musical_key || 'C')
          }
        } else {
          setTransposedKey(music.musical_key || 'C')
        }
      } catch {
        setTransposedKey(music.musical_key || 'C')
      }
    }
    load()
  }, [music?.id])

  const savePreferences = async (newKey: string, newCapo: number, newArrangement: string | null) => {
    if (!music) return
    try {
      setIsSavingPref(true)
      const originalKeyMatch =
        music.chord_content?.match(/^\{key:\s*([A-G][#b]?)\}/m) ||
        music.chord_content?.match(/^\{k:\s*([A-G][#b]?)\}/m)
      const originalKey = originalKeyMatch?.[1] ?? 'C'
      const originalIndex = MUSICAL_KEYS.indexOf(originalKey)
      const newIndex = MUSICAL_KEYS.indexOf(newKey)
      let transposeAmount = 0
      if (originalIndex !== -1 && newIndex !== -1) {
        transposeAmount = (newIndex - originalIndex + 12) % 12
      }
      await fetch(`/api/files/${music.id}/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transposeAmount, capoFret: newCapo, arrangementJson: newArrangement }),
      })
      setTransposedKey(newKey)
      setCapoFret(newCapo)
      setArrangementJson(newArrangement)
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível salvar preferências.', variant: 'destructive' })
    } finally {
      setIsSavingPref(false)
    }
  }

  // PDF loading
  useEffect(() => {
    if (music?.id && music.content_type !== 'chord') {
      loadPdf(music.id)
    } else {
      setPdfUrl(null)
      setPdfError(false)
    }
  }, [music?.id, music?.content_type])

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    }
  }, [pdfUrl])

  const loadPdf = async (fileId: number) => {
    try {
      setLoadingPdf(true)
      setPdfError(false)
      const res = await fetch(`/api/files/${fileId}/stream`, {
        headers: { Accept: 'application/pdf' },
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`${res.status}`)
      const blob = await res.blob()
      setPdfUrl(URL.createObjectURL(blob))
    } catch {
      setPdfError(true)
    } finally {
      setLoadingPdf(false)
    }
  }

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
    } catch (error) {
      toast({ title: 'Erro', description: handleApiError(error), variant: 'destructive' })
    }
  }

  const effectiveKey = transposedKey || music?.musical_key || 'C'

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        {/* Skeleton command bar */}
        <div className="border-b border-border px-4 py-3 flex items-center gap-3">
          <div className="flex-1 space-y-1.5">
            <div className="h-4 w-48 bg-muted rounded animate-pulse" />
            <div className="h-3 w-32 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-6 w-16 bg-muted rounded animate-pulse" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  if (error || !music) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-3 text-muted-foreground p-8">
        <Eye className="h-10 w-10 opacity-30" />
        <p className="text-sm">Não foi possível carregar a música.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Command Bar */}
      <div className="shrink-0 border-b border-border bg-card px-4 py-2.5 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Music2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate leading-tight">
              {music.title || music.original_name}
            </div>
            {music.artist && (
              <div className="text-xs text-muted-foreground truncate">{music.artist}</div>
            )}
          </div>
        </div>

        {music.musical_key && (
          <Badge variant="secondary" className="shrink-0 font-mono">
            {music.musical_key}
          </Badge>
        )}

        {/* Display settings (chord only) */}
        {music.content_type === 'chord' && (
          <MusicDisplaySettings
            fontSize={prefs.fontSize}
            setFontSize={(v) => updatePrefs({ fontSize: v })}
            showChords={prefs.showChords}
            setShowChords={(v) => updatePrefs({ showChords: v })}
            chordColor={prefs.chordColor}
            setChordColor={(v) => updatePrefs({ chordColor: v })}
            columnView={prefs.columnView}
            setColumnView={(v) => updatePrefs({ columnView: v })}
          />
        )}

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">Mais ações</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem asChild>
              <Link href={`/music/${music.id}`} target="_blank">
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir em nova aba
              </Link>
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
              <>
                <DropdownMenuSeparator />
                <AddToListModal
                  musicId={music.id}
                  musicTitle={music.title || music.original_name}
                  trigger={
                    <DropdownMenuItem onSelect={(e: Event) => e.preventDefault()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar à lista
                    </DropdownMenuItem>
                  }
                />
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Transposition bar — chord only */}
      {music.content_type === 'chord' && (
        <div className="shrink-0 border-b border-border/60 px-4 py-2">
          <TranspositionControls
            originalKey={music.musical_key || 'C'}
            transposedKey={effectiveKey}
            capoFret={capoFret}
            showCapoIndicator={true}
            onKeyChange={(k) => savePreferences(k, capoFret, arrangementJson)}
            onCapoChange={(c) => savePreferences(effectiveKey, c ?? 0, arrangementJson)}
          />
        </div>
      )}

      {/* Tags */}
      {((music.categories && music.categories.length > 0) || music.category ||
        (music.custom_filters && Object.keys(music.custom_filters).length > 0)) && (
        <div className="shrink-0 flex flex-wrap gap-1.5 px-4 py-2 border-b border-border/40">
          {music.categories && music.categories.length > 0
            ? music.categories.map((cat, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {cat}
                </Badge>
              ))
            : music.category
            ? <Badge variant="secondary" className="text-xs">{music.category}</Badge>
            : null}
          {music.custom_filters &&
            Object.entries(music.custom_filters).map(([slug, group]) =>
              group.values.map((val, i) => (
                <Badge key={`${slug}-${i}`} variant="outline" className="text-xs">
                  {val}
                </Badge>
              ))
            )}
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {music.content_type === 'chord' && music.chord_content ? (
          <div className="p-4">
            {isSavingPref && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Salvando preferências…
              </div>
            )}
            <ChordPreview
              chordContent={music.chord_content}
              transposedKey={effectiveKey}
              capoFret={capoFret}
              arrangementJson={arrangementJson || undefined}
              fontSize={prefs.fontSize}
              showChords={prefs.showChords}
              chordColor={prefs.chordColor}
              columnView={prefs.columnView}
            />
          </div>
        ) : (
          <div className="h-full">
            {loadingPdf ? (
              <div className="flex items-center justify-center h-64 bg-muted/30">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="text-sm">Carregando PDF…</span>
                </div>
              </div>
            ) : pdfError ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
                <Eye className="h-10 w-10 opacity-30" />
                <p className="text-sm">Não foi possível carregar o PDF</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => loadPdf(music.id)} className="gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5" /> Tentar novamente
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/api/files/${music.id}/stream`, '_blank')}
                    className="gap-1.5"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Abrir em nova aba
                  </Button>
                </div>
              </div>
            ) : pdfUrl ? (
              <iframe src={pdfUrl} className="w-full h-full min-h-[60vh]" title="PDF" />
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
                PDF não disponível
              </div>
            )}
          </div>
        )}

        {(music.content_type === 'pdf_only' || music.content_type === 'chord_converting') && (
          <div className="p-4">
            <OcrConvertCard
              musicId={music.id}
              contentType={music.content_type}
              ocrStatus={music.ocr_status}
              canConvert={canEdit}
            />
          </div>
        )}
      </div>
    </div>
  )
}
