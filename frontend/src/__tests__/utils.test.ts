import { describe, it, expect } from 'vitest'
import {
  formatFileSize,
  formatRelativeTime,
  isValidEmail,
  isValidYouTubeUrl,
  extractYouTubeId,
  truncateText,
  slugify,
  uniqueBy,
  groupBy,
  sortBy,
  clamp,
  round,
  fuzzySearch,
  highlightText,
  generateColorFromString,
  handleApiError,
} from '@/lib/utils'

describe('formatFileSize', () => {
  it('should format 0 bytes', () => {
    expect(formatFileSize(0)).toBe('0 Bytes')
  })

  it('should format bytes', () => {
    expect(formatFileSize(500)).toBe('500 Bytes')
  })

  it('should format KB', () => {
    expect(formatFileSize(1024)).toBe('1 KB')
  })

  it('should format MB', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1 MB')
  })

  it('should format with decimals', () => {
    expect(formatFileSize(1536)).toBe('1.5 KB')
  })
})

describe('formatRelativeTime', () => {
  it('should return "Hoje" for today', () => {
    expect(formatRelativeTime(new Date().toISOString())).toBe('Hoje')
  })

  it('should return "Ontem" for yesterday', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    expect(formatRelativeTime(yesterday.toISOString())).toBe('Ontem')
  })

  it('should return days for recent dates', () => {
    const date = new Date()
    date.setDate(date.getDate() - 3)
    expect(formatRelativeTime(date.toISOString())).toBe('3 dias atrás')
  })

  it('should return weeks', () => {
    const date = new Date()
    date.setDate(date.getDate() - 14)
    expect(formatRelativeTime(date.toISOString())).toBe('2 semanas atrás')
  })

  it('should return months', () => {
    const date = new Date()
    date.setDate(date.getDate() - 60)
    expect(formatRelativeTime(date.toISOString())).toBe('2 meses atrás')
  })
})

describe('isValidEmail', () => {
  it('should validate correct emails', () => {
    expect(isValidEmail('test@example.com')).toBe(true)
    expect(isValidEmail('user.name@domain.co')).toBe(true)
  })

  it('should reject invalid emails', () => {
    expect(isValidEmail('')).toBe(false)
    expect(isValidEmail('notanemail')).toBe(false)
    expect(isValidEmail('@domain.com')).toBe(false)
    expect(isValidEmail('user@')).toBe(false)
  })
})

describe('isValidYouTubeUrl', () => {
  it('should validate YouTube URLs', () => {
    expect(isValidYouTubeUrl('https://www.youtube.com/watch?v=abc123')).toBe(true)
    expect(isValidYouTubeUrl('https://youtu.be/abc123')).toBe(true)
    expect(isValidYouTubeUrl('http://youtube.com/embed/abc123')).toBe(true)
  })

  it('should reject non-YouTube URLs', () => {
    expect(isValidYouTubeUrl('https://vimeo.com/123')).toBe(false)
    expect(isValidYouTubeUrl('not a url')).toBe(false)
  })
})

describe('extractYouTubeId', () => {
  it('should extract ID from watch URL', () => {
    expect(extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('should extract ID from short URL', () => {
    expect(extractYouTubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })

  it('should return null for invalid URL', () => {
    expect(extractYouTubeId('https://example.com')).toBeNull()
  })
})

describe('truncateText', () => {
  it('should truncate long text', () => {
    expect(truncateText('Hello World', 5)).toBe('Hello...')
  })

  it('should not truncate short text', () => {
    expect(truncateText('Hi', 10)).toBe('Hi')
  })

  it('should handle exact length', () => {
    expect(truncateText('12345', 5)).toBe('12345')
  })
})

describe('slugify', () => {
  it('should convert to slug', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })

  it('should remove accents', () => {
    expect(slugify('Música Católica')).toBe('musica-catolica')
  })

  it('should remove special chars', () => {
    expect(slugify('Hello! @World#')).toBe('hello-world')
  })

  it('should collapse multiple hyphens', () => {
    expect(slugify('a  b   c')).toBe('a-b-c')
  })
})

describe('uniqueBy', () => {
  it('should return unique items by key', () => {
    const items = [
      { id: 1, name: 'a' },
      { id: 2, name: 'b' },
      { id: 1, name: 'c' },
    ]
    const result = uniqueBy(items, 'id')
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('a')
  })
})

describe('groupBy', () => {
  it('should group items by key', () => {
    const items = [
      { type: 'a', val: 1 },
      { type: 'b', val: 2 },
      { type: 'a', val: 3 },
    ]
    const groups = groupBy(items, 'type')
    expect(groups['a']).toHaveLength(2)
    expect(groups['b']).toHaveLength(1)
  })
})

describe('sortBy', () => {
  it('should sort ascending', () => {
    const items = [{ n: 3 }, { n: 1 }, { n: 2 }]
    const sorted = sortBy(items, 'n', 'asc')
    expect(sorted.map(i => i.n)).toEqual([1, 2, 3])
  })

  it('should sort descending', () => {
    const items = [{ n: 1 }, { n: 3 }, { n: 2 }]
    const sorted = sortBy(items, 'n', 'desc')
    expect(sorted.map(i => i.n)).toEqual([3, 2, 1])
  })

  it('should not mutate original array', () => {
    const items = [{ n: 3 }, { n: 1 }]
    sortBy(items, 'n')
    expect(items[0].n).toBe(3)
  })
})

describe('clamp', () => {
  it('should clamp below min', () => {
    expect(clamp(-5, 0, 10)).toBe(0)
  })

  it('should clamp above max', () => {
    expect(clamp(15, 0, 10)).toBe(10)
  })

  it('should return value when in range', () => {
    expect(clamp(5, 0, 10)).toBe(5)
  })
})

describe('round', () => {
  it('should round to 2 decimal places by default', () => {
    expect(round(3.14159)).toBe(3.14)
  })

  it('should round to specified decimal places', () => {
    expect(round(3.14159, 3)).toBe(3.142)
  })

  it('should round to 0 places', () => {
    expect(round(3.7, 0)).toBe(4)
  })
})

describe('fuzzySearch', () => {
  it('should match substring', () => {
    expect(fuzzySearch('mar', 'Ave Maria')).toBe(true)
  })

  it('should match with accents', () => {
    expect(fuzzySearch('musica', 'Música')).toBe(true)
  })

  it('should match fuzzy sequence', () => {
    expect(fuzzySearch('am', 'Ave Maria')).toBe(true)
  })

  it('should not match unrelated text', () => {
    expect(fuzzySearch('xyz', 'Hello')).toBe(false)
  })
})

describe('highlightText', () => {
  it('should wrap matches in mark tags', () => {
    expect(highlightText('Hello World', 'World')).toBe('Hello <mark>World</mark>')
  })

  it('should return original text for empty query', () => {
    expect(highlightText('Hello', '')).toBe('Hello')
  })

  it('should be case insensitive', () => {
    expect(highlightText('Hello World', 'hello')).toBe('<mark>Hello</mark> World')
  })
})

describe('generateColorFromString', () => {
  it('should return an HSL string', () => {
    const color = generateColorFromString('test')
    expect(color).toMatch(/^hsl\(\d+, 70%, 60%\)$/)
  })

  it('should return consistent color for same input', () => {
    expect(generateColorFromString('abc')).toBe(generateColorFromString('abc'))
  })

  it('should return different colors for different inputs', () => {
    expect(generateColorFromString('a')).not.toBe(generateColorFromString('z'))
  })
})
