'use client'

import { ConfirmDialog as CoreConfirmDialog } from '@core/components/confirm-dialog'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive'
  onConfirm: () => void | Promise<void>
  loading?: boolean
}

export function ConfirmDialog({
  confirmText,
  cancelText,
  loading,
  ...props
}: ConfirmDialogProps) {
  return (
    <CoreConfirmDialog
      confirmLabel={confirmText}
      cancelLabel={cancelText}
      isPending={loading}
      {...props}
    />
  )
}
