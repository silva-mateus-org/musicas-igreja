'use client'

import { useState } from 'react'
import { Button } from '@core/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@core/components/ui/select'
import { Badge } from '@core/components/ui/badge'
import { ChevronDown, ChevronUp } from 'lucide-react'

const MUSICAL_KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

interface TranspositionControlsProps {
    originalKey?: string
    transposedKey: string
    capoFret?: number
    onKeyChange: (key: string) => void
    onCapoChange: (capo: number | undefined) => void
    showCapoIndicator?: boolean
}

export function TranspositionControls({
    originalKey,
    transposedKey,
    capoFret,
    onKeyChange,
    onCapoChange,
    showCapoIndicator = true,
}: TranspositionControlsProps) {
    const [useFlats, setUseFlats] = useState(false)

    const currentKeyIndex = MUSICAL_KEYS.indexOf(transposedKey)
    const keysToShow = useFlats ? FLATS : MUSICAL_KEYS

    const transposeSemitones = (delta: number) => {
        const currentIndex = MUSICAL_KEYS.indexOf(transposedKey)
        const newIndex = (currentIndex + delta + 12) % 12
        onKeyChange(MUSICAL_KEYS[newIndex])
    }

    const getCapoFret = (): number => {
        if (!originalKey || !transposedKey) return 0
        const originalIndex = MUSICAL_KEYS.indexOf(originalKey)
        const transposedIndex = MUSICAL_KEYS.indexOf(transposedKey)
        return (transposedIndex - originalIndex + 12) % 12
    }

    const renderKey = (key: string): string => {
        if (useFlats) {
            const index = MUSICAL_KEYS.indexOf(key)
            return FLATS[index]
        }
        return key
    }

    return (
        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg border border-border">
            <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-foreground">Tom:</label>
                <Select value={transposedKey} onValueChange={onKeyChange}>
                    <SelectTrigger className="w-20">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {keysToShow.map((key) => (
                            <SelectItem key={key} value={MUSICAL_KEYS[keysToShow.indexOf(key)]}>
                                {key}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="flex items-center gap-1 border-l border-border pl-3">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => transposeSemitones(-1)}
                    className="h-8 w-8 p-0"
                    title="Diminuir semitom"
                >
                    <ChevronDown className="w-4 h-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => transposeSemitones(1)}
                    className="h-8 w-8 p-0"
                    title="Aumentar semitom"
                >
                    <ChevronUp className="w-4 h-4" />
                </Button>
            </div>

            {showCapoIndicator && transposedKey !== originalKey && (
                <Badge variant="outline" className="ml-2">
                    Capo {getCapoFret()}
                </Badge>
            )}

            {originalKey && (
                <div className="text-xs text-muted-foreground ml-2">
                    Original: {renderKey(originalKey)}
                </div>
            )}
        </div>
    )
}
