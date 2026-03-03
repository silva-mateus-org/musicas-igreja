import { describe, it, expect } from 'vitest'
import { reducer } from '@/hooks/use-toast'

describe('toast reducer', () => {
  const emptyState = { toasts: [] }

  it('ADD_TOAST should add a toast', () => {
    const toast = { id: '1', title: 'Hello', open: true, onOpenChange: () => {} }
    const state = reducer(emptyState, { type: 'ADD_TOAST', toast })

    expect(state.toasts).toHaveLength(1)
    expect(state.toasts[0].title).toBe('Hello')
  })

  it('ADD_TOAST should respect TOAST_LIMIT of 1', () => {
    const toast1 = { id: '1', title: 'First', open: true, onOpenChange: () => {} }
    const toast2 = { id: '2', title: 'Second', open: true, onOpenChange: () => {} }

    let state = reducer(emptyState, { type: 'ADD_TOAST', toast: toast1 })
    state = reducer(state, { type: 'ADD_TOAST', toast: toast2 })

    expect(state.toasts).toHaveLength(1)
    expect(state.toasts[0].title).toBe('Second')
  })

  it('UPDATE_TOAST should update matching toast', () => {
    const toast = { id: '1', title: 'Original', open: true, onOpenChange: () => {} }
    let state = reducer(emptyState, { type: 'ADD_TOAST', toast })

    state = reducer(state, { type: 'UPDATE_TOAST', toast: { id: '1', title: 'Updated' } })

    expect(state.toasts[0].title).toBe('Updated')
  })

  it('DISMISS_TOAST should set open to false', () => {
    const toast = { id: '1', title: 'Test', open: true, onOpenChange: () => {} }
    let state = reducer(emptyState, { type: 'ADD_TOAST', toast })

    state = reducer(state, { type: 'DISMISS_TOAST', toastId: '1' })

    expect(state.toasts[0].open).toBe(false)
  })

  it('REMOVE_TOAST should remove specific toast', () => {
    const toast = { id: '1', title: 'Test', open: true, onOpenChange: () => {} }
    let state = reducer(emptyState, { type: 'ADD_TOAST', toast })

    state = reducer(state, { type: 'REMOVE_TOAST', toastId: '1' })

    expect(state.toasts).toHaveLength(0)
  })

  it('REMOVE_TOAST without id should clear all', () => {
    const toast = { id: '1', title: 'Test', open: true, onOpenChange: () => {} }
    let state = reducer(emptyState, { type: 'ADD_TOAST', toast })

    state = reducer(state, { type: 'REMOVE_TOAST', toastId: undefined })

    expect(state.toasts).toHaveLength(0)
  })
})
