import { HTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/utils'

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'agendado' | 'confirmado' | 'compareceu' | 'faltou' | 'cancelado' | 'follow_up' | 'cancelou_agendamento' | 'abandonou_conversa'
}

export const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'agendado', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider',
          {
            'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300': variant === 'agendado',
            'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400': variant === 'confirmado',
            'bg-success/20 text-success': variant === 'compareceu',
            'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400': variant === 'faltou',
            'bg-error/20 text-error': variant === 'cancelado',
            'bg-warning/20 text-warning': variant === 'follow_up',
            'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400': variant === 'cancelou_agendamento',
            'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400': variant === 'abandonou_conversa',
          },
          className
        )}
        {...props}
      />
    )
  }
)
Badge.displayName = 'Badge'
