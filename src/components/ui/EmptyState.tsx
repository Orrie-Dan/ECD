import { type ReactNode } from 'react'
import { common } from '@/locales/rw/common'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center bg-surface rounded-xl border border-border shadow-card">
      {icon && (
        <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-background-subtle mb-6" aria-hidden="true">
          {icon}
        </div>
      )}
      <h3 className="text-heading text-text mb-2">{title}</h3>
      {description && (
        <p className="text-body text-text-secondary max-w-sm mb-6">{description}</p>
      )}
      {action}
    </div>
  )
}

interface DataTableColumn<T> {
  key: string
  header: string
  render: (row: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  data: T[]
  keyExtractor: (row: T) => string
  emptyMessage?: string
}

export function DataTable<T>({ columns, data, keyExtractor, emptyMessage = common.ui.emptyTable }: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <p className="text-body text-text-secondary text-center py-12 bg-surface rounded-xl border border-border">
        {emptyMessage}
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border shadow-card bg-surface">
      <table className="w-full text-left">
        <thead>
          <tr className="bg-background-subtle border-b border-border">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-5 py-4 text-caption font-semibold uppercase tracking-wide text-text-secondary ${col.className ?? ''}`}
                scope="col"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={keyExtractor(row)}
              className="border-b border-border last:border-b-0 hover:bg-background-subtle/60 transition-colors"
            >
              {columns.map((col) => (
                <td key={col.key} className={`px-5 py-4 text-body ${col.className ?? ''}`}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
