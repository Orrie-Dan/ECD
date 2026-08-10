import type { ReactNode } from 'react'
import { Card } from '@/components/ui/Card'

export function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4 py-2.5 border-b border-border last:border-0">
      <dt className="text-body text-text-secondary shrink-0">{label}</dt>
      <dd className="text-body font-semibold text-text sm:text-right break-words">{value}</dd>
    </div>
  )
}

interface InfoCardProps {
  title: string
  children: ReactNode
  className?: string
}

export function ChildInfoCard({ title, children, className = '' }: InfoCardProps) {
  return (
    <Card padding="lg" className={className}>
      <h3 className="text-label text-primary mb-4">{title}</h3>
      <dl>{children}</dl>
    </Card>
  )
}
