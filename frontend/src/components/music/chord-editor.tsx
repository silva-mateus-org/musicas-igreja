'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@core/components/ui/card'
import { Textarea } from '@core/components/ui/textarea'
import { Button } from '@core/components/ui/button'
import { Label } from '@core/components/ui/label'
import { convertChordProToText, convertTextToChordPro, extractUniqueChords } from '@/lib/chordpro'

const CHORD_PATTERN = /\[([A-G][#b]?(?:m|maj|min|aug|dim)?(?:\d+)?(?:\/[A-G][#b]?)?)\]/g
const HEADER_PATTERN = /^\{([^:]+):\s*(.+?)\}$/gm

interface ChordEditorProps {
    value: string
    onChange: (value: string) => void
    readOnly?: boolean
    placeholder?: string
}

export function ChordEditor({
    value,
    onChange,
    readOnly = false,
    placeholder = '{title: Título}\n{artist: Artista}\n{key: C}\n\n[G]Primeira [Am]linha\n[D]Segunda [G]linha',
}: ChordEditorProps) {
    const [helpOpen, setHelpOpen] = useState(false)
    const [editorMode, setEditorMode] = useState<'chordpro' | 'visual'>('chordpro')
    const [visualText, setVisualText] = useState('')
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    // Sync visualText when mode changes to visual
    useEffect(() => {
        if (editorMode === 'visual') {
            setVisualText(convertChordProToText(value))
        }
    }, [editorMode, value])

    const handleVisualChange = (newVisualText: string) => {
        setVisualText(newVisualText)
        // Parse back to chordpro behind the scenes
        onChange(convertTextToChordPro(newVisualText))
    }

    const toggleMode = () => {
        if (editorMode === 'chordpro') {
            setEditorMode('visual')
        } else {
            // When going back to chordpro, ensure the latest visual changes are saved
            onChange(convertTextToChordPro(visualText))
            setEditorMode('chordpro')
        }
    }

    const insertTemplate = () => {
        const template = `{title: Nome da Música}
{artist: Artista}
{key: C}

[C]Verso 1
[Dm]Com acordes entre [G]colchetes

[Am]Verso 2
Continuando a [F]letra aqui
`
        if (editorMode === 'visual') {
            setVisualText(convertChordProToText(template))
        }
        onChange(template)
    }

    const countChords = (text: string) => {
        const matches = text.match(CHORD_PATTERN)
        return matches ? matches.length : 0
    }

    const lines = value.split('\n').length
    const chordCount = countChords(value)
    
    // Extract unique chords for the Smart Chords bar
    // We use the ChordPro value to extract them
    const uniqueChords = extractUniqueChords(value)

    const insertChord = (chord: string) => {
        const textarea = textareaRef.current
        if (!textarea) return

        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        
        let textToInsert = ''
        if (editorMode === 'chordpro') {
            textToInsert = `[${chord}]`
            const newValue = value.substring(0, start) + textToInsert + value.substring(end)
            onChange(newValue)
        } else {
            textToInsert = chord + ' '
            const newValue = visualText.substring(0, start) + textToInsert + visualText.substring(end)
            handleVisualChange(newValue)
        }
        
        // Restore cursor position slightly after the react cycle
        setTimeout(() => {
            textarea.focus()
            textarea.setSelectionRange(start + textToInsert.length, start + textToInsert.length)
        }, 0)
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle>Editor de Cifras</CardTitle>
                        <div className="flex gap-2">
                            <Button
                                variant={editorMode === 'visual' ? 'default' : 'outline'}
                                size="sm"
                                onClick={toggleMode}
                            >
                                {editorMode === 'visual' ? 'Modo Visual (Ativo)' : 'Modo Visual'}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setHelpOpen(!helpOpen)}
                            >
                                {helpOpen ? 'Ocultar' : 'Ajuda'}
                            </Button>
                            {!readOnly && (
                                <>
                                    <Button variant="outline" size="sm" onClick={() => onChange(convertTextToChordPro(editorMode === 'chordpro' ? value : visualText))}>
                                        Auto-Formatar
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={insertTemplate}>
                                        Template
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </CardHeader>

                {helpOpen && (
                    <div className="px-6 py-3 bg-muted border-t border-border text-sm space-y-2">
                        <p>
                            <strong>Formato ChordPro:</strong> Use <code className="bg-card px-1 rounded">{'{title: Nome}'}</code> para metadados
                        </p>
                        <p>
                            <strong>Acordes:</strong> Coloque entre colchetes: <code className="bg-card px-1 rounded">[C]texto [Am]aqui</code>
                        </p>
                        <p>
                            <strong>Cabeçalho:</strong> Use{' '}
                            <code className="bg-card px-1 rounded">
                                {'{title: ...}'}
                                {'{artist: ...}'}
                                {'{key: ...}'}
                            </code>
                        </p>
                        <p className="text-muted-foreground">Acordes válidos: C, C#/Db, D, D#/Eb, E, F, F#/Gb, G, G#/Ab, A, A#/Bb, B</p>
                    </div>
                )}

                <CardContent className="pt-4 space-y-3">
                    
                    {!readOnly && uniqueChords.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2 p-2 bg-muted rounded-md border border-border">
                            <span className="text-xs text-muted-foreground w-full mb-1">Acordes na Música (Clique para inserir)</span>
                            {uniqueChords.map(chord => (
                                <button 
                                    key={chord}
                                    type="button"
                                    onClick={() => insertChord(chord)}
                                    className="px-2 py-1 bg-card border border-border rounded text-sm font-semibold hover:bg-accent active:bg-accent/80 transition-colors cursor-pointer"
                                >
                                    {chord}
                                </button>
                            ))}
                        </div>
                    )}

                    <Textarea
                        ref={textareaRef}
                        value={editorMode === 'chordpro' ? value : visualText}
                        onChange={(e) => editorMode === 'chordpro' ? onChange(e.target.value) : handleVisualChange(e.target.value)}
                        placeholder={placeholder}
                        readOnly={readOnly}
                        className="font-mono text-sm min-h-96 resize-none"
                    />

                    <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>Linhas: {lines}</span>
                        <span>Acordes: {chordCount}</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
