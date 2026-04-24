'use client'

import { Plus, X, RotateCcw, GripVertical } from 'lucide-react'
import { Button } from '@core/components/ui/button'
import { Badge } from '@core/components/ui/badge'
import { Separator } from '@core/components/ui/separator'
import { ScrollArea } from '@core/components/ui/scroll-area'

interface Section {
  id: string
  label: string
  type: string
}

interface MusicArrangementEditorProps {
  availableSections: Section[]
  currentArrangement: string[]
  onArrangementChange: (newArrangement: string[] | null) => void
}

export function MusicArrangementEditor({
  availableSections,
  currentArrangement,
  onArrangementChange
}: MusicArrangementEditorProps) {
  const handleAddSection = (sectionId: string) => {
    onArrangementChange([...currentArrangement, sectionId])
  }

  const handleRemoveSection = (index: number) => {
    const newArr = [...currentArrangement]
    newArr.splice(index, 1)
    onArrangementChange(newArr.length > 0 ? newArr : null)
  }

  const handleReset = () => {
    onArrangementChange(null)
  }

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="p-4 bg-muted/30 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Montador de Arranjo</h3>
          <p className="text-xs text-muted-foreground">Construa a sequência da música</p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleReset} className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10 gap-1">
          <RotateCcw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Resetar</span>
        </Button>
      </div>

      <div className="p-4 space-y-4">
        {/* Available Sections */}
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Seções Disponíveis</Label>
          <div className="flex flex-wrap gap-2">
            {availableSections.map(sec => (
              <Button
                key={sec.id}
                variant="outline"
                size="sm"
                onClick={() => handleAddSection(sec.id)}
                className="h-8 border-dashed hover:border-solid hover:bg-primary/5 hover:text-primary transition-all gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                {sec.label}
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Current Arrangement */}
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Sequência Atual</Label>
          <div className="flex flex-wrap gap-2 min-h-[40px]">
            {currentArrangement.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-2">Nenhuma seção selecionada. Usando ordem original.</p>
            ) : (
              currentArrangement.map((secId, idx) => {
                const sec = availableSections.find(s => s.id === secId || s.label === secId)
                if (!sec) return null
                return (
                  <div
                    key={`${secId}-${idx}`}
                    className="group flex items-center bg-secondary/50 text-secondary-foreground border border-border rounded-md px-2 py-1 gap-2 animate-in zoom-in-95 duration-200"
                  >
                    <GripVertical className="h-3 w-3 text-muted-foreground/50" />
                    <span className="text-xs font-medium">{sec.label}</span>
                    <button
                      onClick={() => handleRemoveSection(idx)}
                      className="text-muted-foreground hover:text-destructive rounded-full hover:bg-destructive/10 p-0.5 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Label({ children, className }: { children: React.ReactNode, className?: string }) {
  return <div className={className}>{children}</div>
}
