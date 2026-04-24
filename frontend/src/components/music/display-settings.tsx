'use client'

import { Settings2, Type, Music as MusicIcon, Palette } from 'lucide-react'
import { Button } from '@core/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@core/components/ui/popover'
import { Slider } from '@core/components/ui/slider'
import { Switch } from '@core/components/ui/switch'
import { Label } from '@core/components/ui/label'
import { Separator } from '@core/components/ui/separator'

interface MusicDisplaySettingsProps {
  fontSize: number
  setFontSize: (size: number) => void
  showChords: boolean
  setShowChords: (show: boolean) => void
  chordColor: string
  setChordColor: (color: string) => void
  columnView: boolean
  setColumnView: (cols: boolean) => void
}

export function MusicDisplaySettings({
  fontSize,
  setFontSize,
  showChords,
  setShowChords,
  chordColor,
  setChordColor,
  columnView,
  setColumnView
}: MusicDisplaySettingsProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
          <Settings2 className="h-4 w-4" />
          <span className="hidden sm:inline">Exibição</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium leading-none">Ajustes de Exibição</h4>
          </div>
          
          <Separator />
          
          {/* Font Size */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Type className="h-4 w-4 text-muted-foreground" />
                Tamanho da Fonte
              </Label>
              <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                {fontSize}px
              </span>
            </div>
            <Slider
              value={[fontSize]}
              min={12}
              max={32}
              step={1}
              onValueChange={(val) => setFontSize(val[0])}
              className="py-2"
            />
          </div>

          <Separator />

          {/* Show Chords */}
          <div className="flex items-center justify-between">
            <Label htmlFor="show-chords" className="flex items-center gap-2 cursor-pointer">
              <MusicIcon className="h-4 w-4 text-muted-foreground" />
              Mostrar Cifras
            </Label>
            <Switch
              id="show-chords"
              checked={showChords}
              onCheckedChange={setShowChords}
            />
          </div>

          {/* Column View */}
          <div className="flex items-center justify-between">
            <Label htmlFor="column-view" className="flex items-center gap-2 cursor-pointer">
              <div className="h-4 w-4 flex gap-0.5 border border-muted-foreground rounded-sm p-0.5 opacity-70">
                <div className="w-full h-full bg-muted-foreground/30" />
                <div className="w-full h-full bg-muted-foreground/30" />
              </div>
              Visualização em Colunas
            </Label>
            <Switch
              id="column-view"
              checked={columnView}
              onCheckedChange={setColumnView}
            />
          </div>

          <Separator />

          {/* Chord Color */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-muted-foreground" />
              Cor das Cifras
            </Label>
            <div className="flex flex-wrap gap-2 pt-1">
              {[
                { name: 'Padrão', value: 'text-primary' },
                { name: 'Azul', value: 'text-blue-500' },
                { name: 'Vermelho', value: 'text-red-500' },
                { name: 'Verde', value: 'text-green-500' },
                { name: 'Amarelo', value: 'text-yellow-500' },
                { name: 'Laranja', value: 'text-orange-500' },
              ].map((color) => (
                <button
                  key={color.value}
                  onClick={() => setChordColor(color.value)}
                  className={`h-6 w-6 rounded-full border-2 transition-all ${
                    chordColor === color.value ? 'border-foreground ring-2 ring-ring ring-offset-2 ring-offset-background scale-110' : 'border-transparent hover:scale-110'
                  } ${color.value.replace('text-', 'bg-')}`}
                  title={color.name}
                />
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
