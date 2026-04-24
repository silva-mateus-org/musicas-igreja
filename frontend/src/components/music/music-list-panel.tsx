'use client'

import { Badge } from '@core/components/ui/badge'
import { Skeleton } from '@core/components/ui/skeleton'
import { Pagination } from '@/components/ui/pagination'
import { EmptyState } from '@/components/ui/empty-state'
import type { MusicFile } from '@/types'
import { Music2, FileText, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MusicListPanelProps {
  musics: MusicFile[]
  isLoading: boolean
  selectedId: number | null
  onSelect: (music: MusicFile) => void
  pagination?: {
    page: number
    limit: number
    total: number
    pages: number
  }
  onPageChange: (page: number) => void
}

function ContentTypeIcon({ contentType }: { contentType?: string }) {
  if (contentType === 'chord') return <Music2 className="w-3.5 h-3.5 shrink-0 text-blue-500 dark:text-blue-400" />
  if (contentType === 'chord_converting') return <Loader2 className="w-3.5 h-3.5 shrink-0 text-yellow-500 animate-spin" />
  return <FileText className="w-3.5 h-3.5 shrink-0 text-rose-500" />
}

export function MusicListPanel({
  musics,
  isLoading,
  selectedId,
  onSelect,
  pagination,
  onPageChange,
}: MusicListPanelProps) {
  if (isLoading) {
    return (
      <div className="space-y-0">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="px-3 py-2.5 border-b border-border/40 space-y-1.5">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  if (musics.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          title="Nenhuma música"
          description="Tente ajustar os filtros"
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1">
        {musics.map((music) => {
          const isSelected = music.id === selectedId
          const title = music.title || music.original_name
          return (
            <button
              key={music.id}
              onClick={() => onSelect(music)}
              className={cn(
                'w-full text-left px-3 py-2.5 flex items-start gap-2.5 border-b border-border/40 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:bg-muted/60',
                isSelected && 'bg-accent border-l-2 border-l-primary pl-[10px]'
              )}
            >
              <ContentTypeIcon contentType={music.content_type} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1.5">
                  <span className={cn(
                    'text-sm font-medium truncate leading-tight',
                    isSelected ? 'text-primary' : 'text-foreground'
                  )}>
                    {title}
                  </span>
                  {music.musical_key && (
                    <Badge variant="outline" className="text-xs shrink-0 h-5 px-1.5 font-mono">
                      {music.musical_key}
                    </Badge>
                  )}
                </div>
                {music.artist && (
                  <span className="text-xs text-muted-foreground truncate block mt-0.5">
                    {music.artist}
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
      {pagination && pagination.pages > 1 && (
        <div className="p-2 border-t border-border shrink-0">
          <Pagination
            page={pagination.page}
            pages={pagination.pages}
            total={pagination.total}
            limit={pagination.limit}
            onPageChange={onPageChange}
            itemLabel="música"
          />
        </div>
      )}
    </div>
  )
}
