import type { ReactNode } from 'react'
import { Eye, Pencil } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { FormField, TextInput } from '@/components/ui/FormField'
import { caretaker } from '@/locales/rw/caretaker'
import { common } from '@/locales/rw/common'

const shell = caretaker.director.registerCommon

export function RegisterReadOnlyBanner() {
  return (
    <Card padding="md" className="border-border bg-background-subtle">
      <p className="text-body text-text-secondary">{shell.readOnlyHint}</p>
    </Card>
  )
}

interface SupervisoryReadOnlyBannerProps {
  message: string
}

/** Read-only inspection banner for district / NCDA supervisory views. */
export function SupervisoryReadOnlyBanner({ message }: SupervisoryReadOnlyBannerProps) {
  return (
    <Card padding="md" className="border-primary/15 bg-primary-light/20">
      <p className="text-body text-text-secondary">{message}</p>
    </Card>
  )
}

interface RegisterFiltersCardProps {
  children: ReactNode
  className?: string
}

export function RegisterFiltersCard({ children, className = '' }: RegisterFiltersCardProps) {
  return (
    <Card padding="md" elevated className={className}>
      <div className="space-y-3">
        <div>
          <p className="text-body font-semibold text-text">{shell.filtersTitle}</p>
          <p className="text-caption text-text-muted">{shell.filtersHint}</p>
        </div>
        {children}
      </div>
    </Card>
  )
}

interface RegisterMonthFilterProps {
  label?: string
  value: string
  onChange: (value: string) => void
}

export function RegisterMonthFilter({
  label = shell.monthLabel,
  value,
  onChange,
}: RegisterMonthFilterProps) {
  return (
    <FormField label={label}>
      <TextInput
        type="month"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </FormField>
  )
}

interface RegisterSummarySectionProps {
  id: string
  title: string
  hint?: string
  children: ReactNode
}

export function RegisterSummarySection({
  id,
  title,
  hint,
  children,
}: RegisterSummarySectionProps) {
  return (
    <section aria-labelledby={id} className="space-y-2">
      <div>
        <h3 id={id} className="text-subheading text-text">{title}</h3>
        {hint ? <p className="text-caption text-text-muted">{hint}</p> : null}
      </div>
      {children}
    </section>
  )
}

export function RegisterTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="p-4 space-y-3" aria-busy="true" aria-label={shell.loadingList}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} height="3rem" rounded="md" className="w-full" />
      ))}
    </div>
  )
}

export function RegisterCardListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label={shell.loadingList}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} height="7rem" rounded="lg" className="w-full" />
      ))}
    </div>
  )
}

interface RegisterListPanelProps {
  isLoading: boolean
  isError: boolean
  isEmpty: boolean
  emptyTitle: string
  emptyDescription?: string
  emptyAction?: ReactNode
  errorTitle: string
  onRetry?: () => void
  variant?: 'table' | 'cards'
  children: ReactNode
}

export function RegisterListPanel({
  isLoading,
  isError,
  isEmpty,
  emptyTitle,
  emptyDescription,
  emptyAction,
  errorTitle,
  onRetry,
  variant = 'table',
  children,
}: RegisterListPanelProps) {
  if (variant === 'cards' && isLoading) {
    return <RegisterCardListSkeleton />
  }

  if (variant === 'table') {
    return (
      <Card elevated padding="none" className="overflow-hidden">
        {isLoading ? (
          <RegisterTableSkeleton />
        ) : isError ? (
          <div className="p-4">
            <LiveUnavailableState
              title={errorTitle}
              action={
                onRetry ? (
                  <Button variant="secondary" size="sm" onClick={onRetry}>
                    {shell.retry}
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : isEmpty ? (
          <div className="p-4">
            <EmptyState
              title={emptyTitle}
              description={emptyDescription}
              action={emptyAction}
            />
          </div>
        ) : (
          children
        )}
      </Card>
    )
  }

  if (isLoading) return <RegisterCardListSkeleton />
  if (isError) {
    return (
      <LiveUnavailableState
        title={errorTitle}
        action={
          onRetry ? (
            <Button variant="secondary" size="sm" onClick={onRetry}>
              {shell.retry}
            </Button>
          ) : undefined
        }
      />
    )
  }
  if (isEmpty) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    )
  }
  return <>{children}</>
}

interface RegisterRecordCardProps {
  children: ReactNode
  actions?: ReactNode
}

export function RegisterRecordCard({ children, actions }: RegisterRecordCardProps) {
  return (
    <Card
      elevated
      padding="md"
      className="border border-border hover:border-primary/30 transition-colors"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">{children}</div>
        {actions ? <div className="flex flex-wrap gap-1 shrink-0">{actions}</div> : null}
      </div>
    </Card>
  )
}

interface RegisterViewEditActionsProps {
  viewLabel: string
  onView: () => void
  canMutate?: boolean
  onEdit?: () => void
  editLabel?: string
  extra?: ReactNode
}

export function RegisterViewEditActions({
  viewLabel,
  onView,
  canMutate = false,
  onEdit,
  editLabel = common.edit,
  extra,
}: RegisterViewEditActionsProps) {
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        icon={<Eye size={16} />}
        onClick={onView}
        aria-label={viewLabel}
      >
        {viewLabel}
      </Button>
      {canMutate && onEdit ? (
        <Button
          variant="ghost"
          size="sm"
          icon={<Pencil size={16} />}
          onClick={onEdit}
          aria-label={editLabel}
        >
          {editLabel}
        </Button>
      ) : null}
      {extra}
    </>
  )
}

export function RegisterTableWrap({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left responsive-table-cards">{children}</table>
    </div>
  )
}

export function RegisterTableHeadCell({ children }: { children: ReactNode }) {
  return (
    <th className="px-4 py-3 text-caption font-semibold uppercase tracking-wide text-text-secondary">
      {children}
    </th>
  )
}

export function RegisterTableCell({
  label,
  children,
  className = '',
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <td className={`px-4 py-3 text-body text-text ${className}`} data-label={label}>
      {children}
    </td>
  )
}

export function RegisterPaginationFooter({ children }: { children: ReactNode }) {
  return <div className="px-4 py-3 border-t border-border">{children}</div>
}
