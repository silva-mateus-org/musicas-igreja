# 🎵 Cifras Networkmat — UI/UX Audit (Inspired by Songbook Pro)

> [!IMPORTANT]
> This audit compares the current app against **Songbook Pro's** design philosophy: **clean, minimal, music-first**. The #1 principle is that the **music visualization IS the app** — everything else should get out of the way.

---

## Executive Summary

| Area | Current State | Target (Songbook Pro-like) | Priority |
|------|--------------|---------------------------|----------|
| **Music visualization** | Buried inside Cards with headers | Full-width, clean, dominant | 🔴 CRITICAL |
| **Dark mode contrast** | `bg-white` inside dark theme = broken | Theme-aware backgrounds | 🔴 CRITICAL |
| **Information density** | Too many cards, badges, buttons visible at once | Progressive disclosure | 🟠 HIGH |
| **Transposition controls** | Hardcoded `bg-slate-50` = invisible in dark | Compact popover, theme-aware | 🟠 HIGH |
| **Layout (mobile)** | Sidebar + header + breadcrumb + cards | Minimal top bar + content | 🟠 HIGH |
| **Typography** | Generic, same weight everywhere | Clear hierarchy, larger chords | 🟡 MEDIUM |

---

## 🔴 Critical Issues

### 1. White Backgrounds in Dark Mode

Multiple components use hardcoded light-mode colors that break in dark mode:

| File | Line | Problem | Fix |
|------|------|---------|-----|
| [chord-preview.tsx](file:///c:/Users/thi_s/Desktop/pessoal/projeto/core/musicas-igreja/frontend/src/components/music/chord-preview.tsx#L57) | 57 | `bg-white` — white box inside dark theme | Use `bg-background` or `bg-card` |
| [transposition-controls.tsx](file:///c:/Users/thi_s/Desktop/pessoal/projeto/core/musicas-igreja/frontend/src/components/music/transposition-controls.tsx#L56) | 56 | `bg-slate-50`, `text-slate-700`, `border-slate-200` | Use theme tokens |
| [chord-editor.tsx](file:///c:/Users/thi_s/Desktop/pessoal/projeto/core/musicas-igreja/frontend/src/components/music/chord-editor.tsx#L144) | 144 | `bg-blue-50`, `bg-white` | Use `bg-muted`, `bg-card` |
| [chord-editor.tsx](file:///c:/Users/thi_s/Desktop/pessoal/projeto/core/musicas-igreja/frontend/src/components/music/chord-editor.tsx#L166) | 166 | `bg-slate-50`, `border-slate-100` | Use theme tokens |
| [chord-editor.tsx](file:///c:/Users/thi_s/Desktop/pessoal/projeto/core/musicas-igreja/frontend/src/components/music/chord-editor.tsx#L173) | 173 | `bg-white`, `border-slate-200` | Use `bg-card`, `border-border` |
| [page.tsx (music detail)](file:///c:/Users/thi_s/Desktop/pessoal/projeto/core/musicas-igreja/frontend/src/app/music/%5Bid%5D/page.tsx#L398) | 398 | `bg-slate-50` arrangement builder | Use `bg-muted` |
| [page.tsx (music detail)](file:///c:/Users/thi_s/Desktop/pessoal/projeto/core/musicas-igreja/frontend/src/app/music/%5Bid%5D/page.tsx#L434) | 434 | `bg-white` arrangement items | Use `bg-card` |
| [chord page.tsx](file:///c:/Users/thi_s/Desktop/pessoal/projeto/core/musicas-igreja/frontend/src/app/music/%5Bid%5D/chord/page.tsx#L201) | 201 | `text-slate-600` filename | Use `text-muted-foreground` |

### 2. Music Visualization Not Prominent Enough

**Current:** The chord viewer is inside `Card > CardHeader > CardContent > bg-white div > ChordViewer`. That's **4 levels of nesting** before you see the music.

**Songbook Pro approach:** The song takes up **95% of the screen**. Title + key at the top, then immediately the lyrics+chords. No card wrappers, no "Visualização" header card.

---

## 🟠 High Priority Changes

### 3. Music Detail Page — Too Much Above-the-Fold UI

**Current structure (top to bottom):**
1. ← Voltar button + breadcrumb
2. Title + Artist + Categories/Badges (6+ badges possible)
3. 7 action buttons (Instruções, Ver PDF, Download, Editar, Excluir, Adicionar à lista)
4. "Suas Preferências (Cifra)" Card with controls
5. "Visualização" Card with the actual music
6. Sidebar: File info card + YouTube card

**Songbook Pro structure:**
1. ☰ hamburger + Song title + clock | Top bar only
2. **Immediately: the song with chords** (full width)
3. Small floating controls bottom-right (search, play, edit, copy)
4. "Principais ajustes" accessible via a **small popover** (Tom + Capo)

**Proposed redesign:**
- Move breadcrumb into a **collapsed** top bar
- Collapse action buttons into a **single "⋯" menu** on mobile
- Merge transposition controls into a **compact inline bar** or floating popover (like Songbook Pro's "Principais ajustes")
- Remove the Card wrapper from the chord visualization — let it **breathe**
- Move file info to a collapsible section or sheet (bottom drawer on mobile)

### 4. Transposition Controls — Not Theme-Aware

The `TranspositionControls` component uses:
- `bg-slate-50` (invisible in dark mode)
- `text-slate-700` / `text-slate-500` (low contrast in dark)
- `border-slate-200` (invisible in dark)

Should use `bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`.

### 5. Arrangement Builder — Hardcoded Colors

The arrangement builder in `page.tsx` lines 398-451 uses:
- `bg-slate-50` for container
- `text-slate-500` for description
- `bg-white` for items
- `text-slate-400` for remove button

All should use theme tokens.

---

## 🟡 Medium Priority Changes

### 6. Chord Viewer Typography

**Current:** `text-base` for lyrics, `font-bold text-primary` for chords.

**Songbook Pro:** 
- Chords in **bold orange/red** (`text-orange-600`)
- Lyrics in **regular black** on white background
- Clear visual separation between chord line and lyric line
- Generous line spacing

**Proposed:** Keep `text-primary` for chords but increase contrast. Consider an explicit chord color variable.

### 7. Chord Editor — Also Has Contrast Issues

The editor uses `bg-blue-50`, `bg-slate-50`, `bg-white` hardcoded — same dark mode problem. The chord insertion buttons use `bg-white border-slate-200` which disappear in dark mode.

### 8. Mobile Layout — Sidebar is Too Heavy

On mobile the sidebar still takes the same structure as desktop. For a "songbook" app, consider:
- Bottom tab navigation (like most music apps)
- Or at minimum, a much simpler hamburger menu

---

## 📋 Implementation Plan

### Phase 1: Fix Critical Dark Mode Breaks (Immediate)

1. **Replace all hardcoded colors** in:
   - `chord-preview.tsx` 
   - `transposition-controls.tsx`
   - `chord-editor.tsx`
   - `page.tsx` (music detail)
   - `chord/page.tsx` (chord editor page)

2. **Rule:** Never use `bg-white`, `bg-slate-*`, `text-slate-*`, `border-slate-*` directly. Always use `bg-background`, `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`.

### Phase 2: Songbook Pro-Inspired Music View (High Impact)

3. **Redesign `MusicDetailsPage`** to be music-first:
   - Remove Card wrapper from chord viewer
   - Create a compact `SongHeader` with title + key + minimal actions
   - Inline transposition as a compact bar (Tom dropdown + ↑↓ buttons)
   - Collapse actions into overflow menu on mobile
   - Move "Informações do Arquivo" into a sheet/drawer

4. **Redesign `ChordPreview`** to be full-width, clean:
   - Remove Card + CardHeader "Visualização" wrapper
   - Just render `ChordViewer` directly
   - White/clean background for reading (using theme tokens)

### Phase 3: Polish & Consistency

5. Fix chord editor dark mode
6. Improve mobile typography sizing
7. Add font-size control like Songbook Pro (A- A+)

---

## Design Tokens Alignment

Based on UI/UX Pro Max design system recommendation:

| Token | Current Value (Dark) | Recommended |
|-------|---------------------|-------------|
| `--background` | `0 0% 3.9%` (near black) | Keep |
| `--card` | `0 0% 3.9%` (same as bg) | Keep or slightly lighter |
| `--foreground` | `0 0% 98%` (white text) | Keep |
| `--primary` | `0 0% 98%` (white) | Consider `24 100% 50%` (orange) for chords |
| `--muted` | `0 0% 14.9%` | Keep |

> [!TIP]
> Consider adding a `--chord-color` CSS variable (orange like Songbook Pro) that's distinct from `--primary` to make chords pop visually.
