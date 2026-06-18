import { Card } from '@/components/ui/Card'
import { type ReactNode } from 'react'

type StatVariant = 'default' | 'success' | 'warning'

const variantStyles: Record<StatVariant, string> = {
  default: 'border-border bg-surface',
  success: 'border-success/25 bg-success-light/40',
  warning: 'border-warning/25 bg-warning-light/50',
}

interface StatCardProps {
  icon: ReactNode
  label: string
  value: number | string
  variant?: StatVariant
}

export function StatCard({ icon, label, value, variant = 'default' }: StatCardProps) {
  return (
    <Card padding="lg" className={variantStyles[variant]}>
      <div className="flex items-center gap-4">
        <span className="flex items-center justify-center w-12 h-12 rounded-xl bg-background-subtle border border-border text-primary shrink-0" aria-hidden="true">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-body font-semibold text-text-secondary">{label}</p>
          <p className="text-display text-text leading-tight mt-1">{value}</p>
        </div>
      </div>
    </Card>
  )
}
