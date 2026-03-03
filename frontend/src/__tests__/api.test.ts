import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleApiError } from '@/lib/api'

describe('handleApiError', () => {
  it('should extract message from Error instance', () => {
    expect(handleApiError(new Error('Something failed'))).toBe('Something failed')
  })

  it('should return default message for non-Error', () => {
    expect(handleApiError('string error')).toBe('Ocorreu um erro desconhecido')
  })

  it('should return default message for null', () => {
    expect(handleApiError(null)).toBe('Ocorreu um erro desconhecido')
  })

  it('should return default message for undefined', () => {
    expect(handleApiError(undefined)).toBe('Ocorreu um erro desconhecido')
  })

  it('should return default message for object', () => {
    expect(handleApiError({ code: 500 })).toBe('Ocorreu um erro desconhecido')
  })
})

describe('request function', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('should throw on non-ok response with error message', async () => {
    const { request } = await import('@/lib/api')

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      statusText: 'Not Found',
      json: () => Promise.resolve({ error: 'Recurso não encontrado' }),
    }))

    await expect(request('/test')).rejects.toThrow('Recurso não encontrado')
  })

  it('should throw with statusText if JSON parsing fails', async () => {
    const { request } = await import('@/lib/api')

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      statusText: 'Internal Server Error',
      json: () => Promise.reject(new Error('invalid json')),
    }))

    await expect(request('/test')).rejects.toThrow('Internal Server Error')
  })

  it('should parse JSON response on success', async () => {
    const { request } = await import('@/lib/api')

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ data: 'test' }),
    }))

    const result = await request('/test')
    expect(result).toEqual({ data: 'test' })
  })

  it('should parse text response when not JSON', async () => {
    const { request } = await import('@/lib/api')

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'text/plain' },
      text: () => Promise.resolve('plain text'),
    }))

    const result = await request('/test')
    expect(result).toBe('plain text')
  })
})
