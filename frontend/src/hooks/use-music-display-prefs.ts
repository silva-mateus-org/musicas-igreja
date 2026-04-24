'use client'

import { useState, useCallback } from 'react'

export interface MusicDisplayPrefs {
  fontSize: number
  showChords: boolean
  chordColor: string
  columnView: boolean
}

const DEFAULT_PREFS: MusicDisplayPrefs = {
  fontSize: 16,
  showChords: true,
  chordColor: 'text-primary',
  columnView: false,
}

const STORAGE_KEY = 'music-display-prefs'

export function useMusicDisplayPrefs() {
  const [prefs, setPrefsState] = useState<MusicDisplayPrefs>(() => {
    if (typeof window === 'undefined') return DEFAULT_PREFS
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? { ...DEFAULT_PREFS, ...JSON.parse(stored) } : DEFAULT_PREFS
    } catch {
      return DEFAULT_PREFS
    }
  })

  const updatePrefs = useCallback((updates: Partial<MusicDisplayPrefs>) => {
    setPrefsState(prev => {
      const next = { ...prev, ...updates }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch { /* ignore quota errors */ }
      return next
    })
  }, [])

  return [prefs, updatePrefs] as const
}
