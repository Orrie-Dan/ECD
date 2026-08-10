import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  X,
  Building2,
  Users,
  User,
  TrendingUp,
  TrendingDown,
  Minus,
  MapPin,
  Phone,
  Clock,
  AlertTriangle,
  UserPlus,
  ArrowRight,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EnhancedLineChart, ChartPeriodFilter, type ChartPeriodFilterValue } from '@/components/charts'
import { CHART_METRIC_COLORS } from '@/lib/chart-theme'
import { toCenterEnrollmentChartData } from '@/lib/chart-data'
import { filterByMonthLabel } from '@/lib/chart-period'
import { district } from '@/locales/rw/district'
import { common } from '@/locales/rw/common'
import {
  ECD_CENTERS,
  getCenterRecentActivity,
  getCenterEnrollmentHistoryForPeriod,
  ACTION_ALERTS,
  formatDate,
} from '@/lib/mock-data'

interface SchoolQuickPreviewProps {
  centerId: string
  onClose: () => void
}

export function SchoolQuickPreview({ centerId, onClose }: SchoolQuickPreviewProps) {
  const center = ECD_CENTERS.find((c) => c.id === centerId)
  const [chartPeriod, setChartPeriod] = useState<ChartPeriodFilterValue>({ period: 'month', month: '' })

  const enrollmentHistory = useMemo(() => {
    if (!center) return []
    let history = getCenterEnrollmentHistoryForPeriod(center.id, chartPeriod.period)
    if (chartPeriod.period === 'year' && chartPeriod.month) {
      history = filterByMonthLabel(
        history.map((h) => ({ ...h, label: h.month })),
        chartPeriod.month,
      ).map(({ month, registered, dropouts, total }) => ({
        month,
        registered,
        dropouts,
        total,
      }))
    }
    return history
  }, [center, chartPeriod])
  const enrollmentChartData = useMemo(
    () => toCenterEnrollmentChartData(enrollmentHistory),
    [enrollmentHistory],
  )
  const enrollmentSeries = useMemo(
    () => [
      {
        dataKey: 'newRegistrations',
        label: district.centerDetail.newRegistrations,
        color: CHART_METRIC_COLORS.newRegistrations,
      },
      {
        dataKey: 'dropouts',
        label: district.centerDetail.dropoutsMonth,
        color: CHART_METRIC_COLORS.dropouts,
      },
    ],
    [],
  )

  if (!center) {
    return (
      <div className="fixed inset-y-0 right-0 w-full sm:w-[400px] bg-surface border-l border-border shadow-xl z-50 overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-heading text-text">{district.schools.quickPreview}</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-background-subtle transition-colors"
              aria-label={common.close}
            >
              <X size={20} className="text-text-muted" />
            </button>
          </div>
          <p className="text-body text-text-secondary">{district.centerDetail.notFound}</p>
        </div>
      </div>
    )
  }

  const recentActivity = getCenterRecentActivity(center.id)
  const alerts = ACTION_ALERTS.filter((a) => a.centerId === center.id)

  const enrollmentTrendValue =
    center.enrollmentChange > 0 ? (
      <span className="inline-flex items-center gap-1 text-success">
        <TrendingUp size={16} />
        +{center.enrollmentChange}
      </span>
    ) : center.enrollmentChange < 0 ? (
      <span className="inline-flex items-center gap-1 text-warning">
        <TrendingDown size={16} />
        {center.enrollmentChange}
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-text-muted">
        <Minus size={16} />0
      </span>
    )

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[420px] bg-surface border-l border-border shadow-xl z-50 overflow-y-auto animate-in slide-in-from-right duration-200">
      <div className="sticky top-0 bg-surface border-b border-border p-4 z-10">
        <div className="flex items-center justify-between">
          <h2 className="text-heading text-text">{district.schools.quickPreview}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-background-subtle transition-colors"
            aria-label={common.close}
          >
            <X size={20} className="text-text-muted" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <Card padding="md" className="bg-primary-light/30 border-primary/20">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary-light flex items-center justify-center shrink-0">
              <Building2 size={24} className="text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-subheading text-text line-clamp-2">{center.name}</h3>
              <p className="text-caption text-text-secondary flex items-center gap-1 mt-1">
                <MapPin size={12} />
                {center.sector} · {center.cell}
              </p>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Card padding="sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary-light flex items-center justify-center">
                <Users size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-caption text-text-muted">{district.centerDetail.totalChildren}</p>
                <p className="text-heading text-text">{center.children}</p>
              </div>
            </div>
          </Card>

          <Card padding="sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-success-light flex items-center justify-center">
                <TrendingUp size={16} className="text-success" />
              </div>
              <div>
                <p className="text-caption text-text-muted">{district.centerDetail.attendanceRate}</p>
                <p className={`text-heading ${center.attendance >= 70 ? 'text-success' : 'text-warning'}`}>
                  {center.attendance}%
                </p>
              </div>
            </div>
          </Card>

          <Card padding="sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-secondary-light flex items-center justify-center">
                <UserPlus size={16} className="text-secondary" />
              </div>
              <div>
                <p className="text-caption text-text-muted">{district.centerDetail.enrollmentChange}</p>
                <p className="text-heading text-text">{enrollmentTrendValue}</p>
              </div>
            </div>
          </Card>

          <Card padding="sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-accent-light flex items-center justify-center">
                <User size={16} className="text-accent" />
              </div>
              <div>
                <p className="text-caption text-text-muted">{district.centerDetail.caretaker}</p>
                <p className="text-body text-text font-semibold truncate" title={center.caretaker}>
                  {center.caretaker.split(' ')[0]}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <Card padding="md">
          <div className="flex flex-col gap-3 mb-3">
            <h4 className="text-body font-semibold text-text flex items-center gap-2">
              <UserPlus size={16} className="text-primary" />
              {district.schools.recentRegistrations}
            </h4>
            <ChartPeriodFilter value={chartPeriod} onChange={setChartPeriod} />
          </div>
          <EnhancedLineChart
            data={enrollmentChartData}
            series={enrollmentSeries}
            xDataKey="label"
            height={200}
            ariaLabel={district.schools.recentRegistrations}
          />
        </Card>

        {alerts.length > 0 && (
          <Card padding="md" className="border-warning/30 bg-warning-light/20">
            <h4 className="text-body font-semibold text-text mb-3 flex items-center gap-2">
              <AlertTriangle size={16} className="text-warning" />
              {district.schools.activeAlerts} ({alerts.length})
            </h4>
            <ul className="space-y-2">
              {alerts.slice(0, 3).map((alert) => (
                <li
                  key={alert.id}
                  className="flex items-start gap-2 p-2 rounded-lg bg-surface border border-warning/20"
                >
                  <span
                    className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      alert.priority === 'high'
                        ? 'bg-error'
                        : alert.priority === 'medium'
                          ? 'bg-warning'
                          : 'bg-success'
                    }`}
                  />
                  <p className="text-caption text-text">{alert.description}</p>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card padding="md">
          <h4 className="text-body font-semibold text-text mb-3 flex items-center gap-2">
            <Clock size={16} className="text-text-muted" />
            {district.centerDetail.recentActivity}
          </h4>
          <ul className="space-y-2">
            {recentActivity.slice(0, 3).map((day) => {
              const rate = day.total > 0 ? Math.round((day.present / day.total) * 100) : 0
              return (
                <li
                  key={day.date}
                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-background-subtle/50"
                >
                  <span className="text-caption text-text">{formatDate(day.date)}</span>
                  <span className="text-caption font-semibold text-text">{day.present}/{day.total}</span>
                  <span
                    className={`text-caption font-bold px-2 py-0.5 rounded-full ${
                      rate >= 70 ? 'bg-success-light text-success' : 'bg-warning-light text-warning'
                    }`}
                  >
                    {rate}%
                  </span>
                </li>
              )
            })}
          </ul>
        </Card>

        <Card padding="md">
          <h4 className="text-body font-semibold text-text mb-3 flex items-center gap-2">
            <Phone size={16} className="text-text-muted" />
            {district.schools.contactInfo}
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-caption text-text-muted">{district.centerDetail.caretaker}</span>
              <span className="text-body font-medium text-text">{center.caretaker}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-caption text-text-muted">{district.centers.sector}</span>
              <span className="text-body font-medium text-text">{center.sector}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-caption text-text-muted">{district.centers.cell}</span>
              <span className="text-body font-medium text-text">{center.cell}</span>
            </div>
          </div>
        </Card>

        <Link to={`/district/ibigo/${center.id}`}>
          <Button variant="primary" size="md" className="w-full" icon={<ArrowRight size={18} />}>
            {district.schools.viewFullProfile}
          </Button>
        </Link>
      </div>
    </div>
  )
}
