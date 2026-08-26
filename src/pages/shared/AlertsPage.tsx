import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ChevronRight } from 'lucide-react'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { Button } from '@/components/ui/Button'
import { env } from '@/config/env'
import { useFollowUpAlerts } from '@/features/alerts'
import { useData } from '@/contexts/AppContext'
import { notificationsLocale as t } from '@/locales/rw/notifications'
import { common } from '@/locales/rw/common'
import {
  formatFollowUpAlert,
  resolveFollowUpAlertPath,
  summarizeActionableFollowUpAlerts,
} from '@/lib/follow-up-alerts'
import type { FollowUpAlertCategory, FollowUpAlertPriority, FollowUpAlertViewModel } from '@/models/alerts'

const ALL_CATEGORIES: FollowUpAlertCategory[] = [
  'nutrition', 'attendance', 'referral', 'data_quality',
  'sted', 'transfer', 'compliance', 'capacity',
]

const priorityStyles: Record<FollowUpAlertPriority, { bg: string; border: string; text: string; dot: string }> = {
  high:   { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700',    dot: 'bg-red-500' },
  medium: { bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700',  dot: 'bg-amber-500' },
  low:    { bg: 'bg-slate-50',  border: 'border-slate-200',  text: 'text-slate-600',  dot: 'bg-slate-400' },
}

interface AlertsPageContentProps {
  rolePrefix: string
  districtId?: string
  centerId?: string
}

export function AlertsPageContent({ rolePrefix, districtId, centerId }: AlertsPageContentProps) {
  const navigate = useNavigate()
  const { children } = useData()
  const [category, setCategory] = useState<FollowUpAlertCategory | 'all'>('all')
  const filterByRoster = rolePrefix === '/caretaker'

  const { data, isLoading, isError, refetch } = useFollowUpAlerts(
    {
      // Caretaker: always load the full page so chip/high counts exclude archived kids.
      // District/NCDA: keep server category filter + server counts.
      category: filterByRoster || category === 'all' ? undefined : category,
      limit: 200,
      districtId,
      centerId,
    },
    env.isLive,
  )

  if (!env.isLive) {
    return (
      <PageContainer>
        <PageHeader title={t.alerts.title} />
        <PageContent>
          <LiveUnavailableState title={t.alerts.title} description={t.alerts.emptyDesc} />
        </PageContent>
      </PageContainer>
    )
  }

  if (isError) {
    return (
      <PageContainer>
        <PageHeader title={t.alerts.title} />
        <PageContent>
          <LiveUnavailableState
            title={t.alerts.title}
            description={common.live.unavailableDesc}
            action={
              <Button variant="primary" size="sm" onClick={() => void refetch()}>
                {common.reset}
              </Button>
            }
          />
        </PageContent>
      </PageContainer>
    )
  }

  const roster = filterByRoster ? children : undefined
  const summary = summarizeActionableFollowUpAlerts(data?.items ?? [], roster)
  const counts = filterByRoster ? summary.counts : (data?.counts ?? summary.counts)
  const total = filterByRoster ? summary.total : (data?.total ?? summary.total)
  const items = filterByRoster
    ? category === 'all'
      ? summary.items
      : summary.items.filter((alert) => alert.category === category)
    : summary.items

  function handleAlertClick(alert: FollowUpAlertViewModel) {
    navigate(resolveFollowUpAlertPath(alert, rolePrefix, roster))
  }

  return (
    <PageContainer>
      <PageHeader
        title={t.alerts.title}
        action={
          counts.high > 0 ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-caption font-bold">
              <AlertTriangle size={14} />
              {counts.high} {t.alerts.critical}
            </span>
          ) : undefined
        }
      />
      <PageContent>
        <div className="flex flex-wrap gap-2 mb-5 overflow-x-auto pb-1">
          {(['all', ...ALL_CATEGORIES] as const).map((cat) => {
            const isActive = category === cat
            const count = cat === 'all' ? total : counts[cat]
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.875rem] font-semibold transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-primary !text-white'
                    : 'bg-background-subtle text-text-secondary hover:bg-background'
                }`}
              >
                {t.alerts.categories[cat]}
                {count > 0 && (
                  <span
                    className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-bold leading-none ${
                      isActive ? 'bg-white/20 text-white' : 'bg-border text-text-muted'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <Card padding="lg" className="border-success/20 bg-success-light/20 text-center py-12">
            <p className="text-body font-semibold text-success">{t.alerts.empty}</p>
            <p className="text-caption text-text-secondary mt-1">{t.alerts.emptyDesc}</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {items.map((alert) => {
              const styles = priorityStyles[alert.priority] ?? priorityStyles.medium
              const copy = formatFollowUpAlert(alert, roster)
              return (
                <button
                  key={alert.id}
                  type="button"
                  onClick={() => handleAlertClick(alert)}
                  className={`w-full flex items-start gap-4 p-4 rounded-xl border transition-colors text-left group ${styles.bg} ${styles.border} hover:shadow-sm`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 mt-2 ${styles.dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-body font-semibold ${styles.text}`}>{copy.heading}</p>
                      <span className={`text-caption font-medium px-2 py-0.5 rounded ${styles.bg} ${styles.text} border ${styles.border}`}>
                        {t.alerts.priority[alert.priority]}
                      </span>
                    </div>
                    <p className="text-caption text-text-secondary mt-1">{copy.detail}</p>
                    {alert.centerName && (
                      <p className="text-caption text-text-muted mt-1">{alert.centerName}</p>
                    )}
                    {alert.metrics.length > 0 && (
                      <div className="flex flex-wrap gap-3 mt-2">
                        {alert.metrics.map((m) => (
                          <span key={m.label} className="text-caption text-text-muted">
                            <span className="font-medium">{m.label}:</span> {m.value}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <ChevronRight
                    size={16}
                    className="text-text-muted shrink-0 mt-1 opacity-60 group-hover:opacity-100"
                  />
                </button>
              )
            })}
          </div>
        )}
      </PageContent>
    </PageContainer>
  )
}
