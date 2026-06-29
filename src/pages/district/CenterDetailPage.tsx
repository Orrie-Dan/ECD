import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  Users,
  TrendingUp,
  MapPin,
  User,
  UserMinus,
  UserPlus,
  Phone,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Map,
  ClipboardList,
  Activity,
} from 'lucide-react'
import { DistrictLayout } from '@/layouts/DistrictLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, StatCard } from '@/components/ui/Card'
import { GisEmbed } from '@/components/district/GisEmbed'
import { Button } from '@/components/ui/Button'
import { EnhancedLineChart, ChartPeriodFilter, type ChartPeriodFilterValue } from '@/components/charts'
import { CHART_METRIC_COLORS } from '@/lib/chart-theme'
import { toAttendanceChartData, toCenterEnrollmentChartData } from '@/lib/chart-data'
import { filterByMonthLabel } from '@/lib/chart-period'
import {
  ECD_CENTERS,
  ACTION_ALERTS,
  getCenterRecentActivity,
  getCenterAttendanceTrendForPeriod,
  getCenterEnrollmentHistoryForPeriod,
  getSchoolsTableData,
  formatDate,
} from '@/lib/mock-data'
import { district } from '@/locales/rw/district'
import { useAuth } from '@/contexts/AppContext'

type MonitoringStatus = 'good' | 'followup' | 'critical'

function getMonitoringStatusForCenter(centerId: string): MonitoringStatus {
  const alerts = ACTION_ALERTS.filter((a) => a.centerId === centerId)
  if (alerts.some((a) => a.priority === 'high')) return 'critical'
  if (alerts.length > 0) return 'followup'
  return 'good'
}

function StatusPill({ status }: { status: MonitoringStatus }) {
  const config = {
    good: {
      bg: 'bg-success-light',
      text: 'text-success',
      label: district.schools.statusGood,
      icon: CheckCircle2,
    },
    followup: {
      bg: 'bg-warning-light',
      text: 'text-warning',
      label: district.schools.statusFollowup,
      icon: AlertTriangle,
    },
    critical: {
      bg: 'bg-error/10',
      text: 'text-error',
      label: district.schools.statusCritical,
      icon: ShieldAlert,
    },
  } as const

  const Icon = config[status].icon
  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${config[status].bg} ${config[status].text} text-caption font-semibold`}
      aria-label={config[status].label}
    >
      <Icon size={14} aria-hidden="true" />
      {config[status].label}
    </span>
  )
}

function formatDelta(delta: number, suffix = '') {
  if (delta > 0) return `↑ +${delta}${suffix}`
  if (delta < 0) return `↓ ${delta}${suffix}`
  return `— 0${suffix}`
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export function CenterDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const center = ECD_CENTERS.find((c) => c.id === id)
  const [chartPeriod, setChartPeriod] = useState<ChartPeriodFilterValue>({ period: 'month', month: '' })

  const attendanceTrend = useMemo(
    () => (center ? getCenterAttendanceTrendForPeriod(center.id, chartPeriod.period) : []),
    [center, chartPeriod.period],
  )

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

  const attendanceChartData = useMemo(() => toAttendanceChartData(attendanceTrend), [attendanceTrend])
  const enrollmentChartData = useMemo(
    () => toCenterEnrollmentChartData(enrollmentHistory),
    [enrollmentHistory],
  )

  const attendanceSeries = useMemo(
    () => [
      {
        dataKey: 'attendance',
        label: district.charts.attendanceRate,
        color: CHART_METRIC_COLORS.attendance,
        valueFormatter: (v: number) => `${v}%`,
      },
    ],
    [],
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
      <DistrictLayout>
        <p className="text-body-lg text-text-secondary">{district.centerDetail.notFound}</p>
        <Link to="/district/ibigo" className="text-primary font-semibold mt-4 inline-block">
          ← {district.centerDetail.back}
        </Link>
      </DistrictLayout>
    )
  }

  const recentActivity = getCenterRecentActivity(center.id)
  const enrollmentLabel =
    center.enrollmentChange >= 0 ? `+${center.enrollmentChange}` : `${center.enrollmentChange}`
  const dropoutsMonth = Math.max(0, -center.enrollmentChange + 2)
  const teachers = 1

  const monitoringStatus = getMonitoringStatusForCenter(center.id)
  const alertsForCenter = ACTION_ALERTS.filter((a) => a.centerId === center.id)
  const severeAlertsCount = alertsForCenter.filter((a) => a.priority === 'high').length

  const tableRow = getSchoolsTableData().find((s) => s.id === center.id)
  const lastUpdatedDate = tableRow?.lastActivity ?? (center.submittedToday ? '2026-06-26' : '2026-06-24')

  const now = new Date()
  const daysSinceUpdate = Math.floor(
    (now.getTime() - new Date(lastUpdatedDate).getTime()) / (1000 * 60 * 60 * 24),
  )

  const avgAttendance = Math.round(
    attendanceTrend.reduce((sum, p) => sum + p.rate, 0) / Math.max(1, attendanceTrend.length),
  )
  const best = attendanceTrend.reduce(
    (acc, p) => (p.rate > acc.rate ? p : acc),
    attendanceTrend[0] ?? { date: lastUpdatedDate, rate: center.attendance },
  )
  const worst = attendanceTrend.reduce(
    (acc, p) => (p.rate < acc.rate ? p : acc),
    attendanceTrend[0] ?? { date: lastUpdatedDate, rate: center.attendance },
  )

  const compareWindow = chartPeriod.period === 'today' ? 1 : chartPeriod.period === 'week' ? 3 : 7
  const lastWindow = attendanceTrend.slice(-compareWindow)
  const prevWindow = attendanceTrend.slice(-compareWindow * 2, -compareWindow)
  const avgLastWindow = Math.round(
    lastWindow.reduce((s, p) => s + p.rate, 0) / Math.max(1, lastWindow.length),
  )
  const avgPrevWindow = Math.round(
    prevWindow.reduce((s, p) => s + p.rate, 0) / Math.max(1, prevWindow.length),
  )
  const attendanceDelta = avgLastWindow - avgPrevWindow

  const attendanceOk = center.attendance >= 90
  const attendanceRisk = center.attendance < 80
  const dropoutsRisk = dropoutsMonth >= 5 || center.enrollmentChange < -2
  const enrollmentOk = center.enrollmentChange > 0
  const staleRisk = daysSinceUpdate >= 3 || !center.submittedToday

  const derivedAlerts: Array<{ level: 'high' | 'medium'; text: string }> = []
  if (attendanceRisk) derivedAlerts.push({ level: 'high', text: district.centerDetail.alertLowAttendance })
  if (dropoutsRisk) derivedAlerts.push({ level: 'medium', text: district.centerDetail.alertDropoutsRising })
  if (staleRisk) derivedAlerts.push({ level: 'medium', text: district.centerDetail.alertStaleOrIncomplete })

  const alertsToShow =
    alertsForCenter.length > 0
      ? alertsForCenter.map((a) => ({ level: a.priority === 'high' ? 'high' : 'medium', text: a.description }))
      : derivedAlerts

  const recommendedActions: string[] = []
  if (attendanceRisk || severeAlertsCount > 0) recommendedActions.push(district.centerDetail.actionVisitCenter)
  if (dropoutsRisk) recommendedActions.push(district.centerDetail.actionFollowupDropouts)
  if (!enrollmentOk) recommendedActions.push(district.centerDetail.actionBoostEnrollment)
  if (staleRisk) recommendedActions.push(district.centerDetail.actionUpdateRecords)
  if (recommendedActions.length === 0) recommendedActions.push(district.centerDetail.actionKeepMonitoring)

  const timelineItems: Array<{ label: string; description: string }> = [
    {
      label: district.centerDetail.timelineToday,
      description: center.submittedToday
        ? district.centerDetail.timelineReportSubmitted
        : district.centerDetail.timelineNoReport,
    },
    {
      label: district.centerDetail.timelineYesterday,
      description: recentActivity[1]
        ? district.centerDetail.timelineAttendanceSummary
            .replace('{present}', String(recentActivity[1].present))
            .replace('{total}', String(recentActivity[1].total))
        : district.centerDetail.timelineAttendanceSummary.replace('{present}', '—').replace('{total}', '—'),
    },
    {
      label: district.centerDetail.timelineLastWeek,
      description:
        center.enrollmentChange > 0
          ? district.centerDetail.timelineRegistrations
              .replace('{count}', String(clamp(center.enrollmentChange, 1, 12)))
          : center.enrollmentChange < 0
            ? district.centerDetail.timelineDropouts
                .replace('{count}', String(clamp(Math.abs(center.enrollmentChange) + 2, 1, 12)))
            : district.centerDetail.timelineProfileUpdated,
    },
  ]

  return (
    <DistrictLayout>
      <Link
        to="/district/ibigo"
        className="inline-flex items-center gap-2 text-body font-semibold text-primary hover:underline mb-4"
      >
        <ArrowLeft size={18} />
        {district.centerDetail.back}
      </Link>

      <PageHeader
        title={center.name}
        subtitle={`${center.sector} • ${center.cell}`}
        action={
          <div className="flex flex-col items-start sm:items-end gap-2">
            <StatusPill status={monitoringStatus} />
            <p className="text-caption text-text-secondary">
              {district.schools.lastUpdated}: {formatDate(lastUpdatedDate)}
            </p>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        <StatCard
          label={district.centerDetail.totalChildren}
          value={center.children}
          icon={<Users size={22} className="text-primary" />}
          compact
        />
        <StatCard
          label={district.centerDetail.attendanceRate}
          value={`${avgAttendance}%`}
          icon={<TrendingUp size={22} className="text-success" />}
          trend={formatDelta(attendanceDelta, '%')}
          variant={avgAttendance >= 90 ? 'success' : avgAttendance >= 80 ? 'info' : 'warning'}
          compact
        />
        <StatCard
          label={district.centerDetail.newRegistrations}
          value={enrollmentLabel}
          icon={<UserPlus size={22} className="text-secondary" />}
          variant={center.enrollmentChange >= 0 ? 'success' : 'warning'}
          trend={formatDelta(center.enrollmentChange)}
          compact
        />
        <StatCard
          label={district.centerDetail.dropoutsMonth}
          value={dropoutsMonth}
          icon={<UserMinus size={22} className="text-warning" />}
          variant="warning"
          compact
        />
        <StatCard
          label={district.centerDetail.teachers}
          value={teachers}
          icon={<User size={22} className="text-accent" />}
          compact
        />
        <StatCard
          label={district.centerDetail.severeIssues}
          value={severeAlertsCount}
          icon={<ShieldAlert size={22} className="text-error" />}
          variant={severeAlertsCount > 0 ? 'warning' : 'default'}
          compact
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <div className="xl:col-span-2 space-y-4">
          <Card padding="lg">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
              <div>
                <h3 className="text-subheading text-text mb-1">{district.centerDetail.attendance30Days}</h3>
                <p className="text-body text-text-secondary">
                  {district.centerDetail.attendance30DaysSubtitle}
                </p>
              </div>
              <ChartPeriodFilter
                value={chartPeriod}
                onChange={setChartPeriod}
                className="w-full sm:max-w-xs shrink-0"
              />
            </div>

            <EnhancedLineChart
              data={attendanceChartData}
              series={attendanceSeries}
              xDataKey="label"
              tooltipLabelKey="tooltipLabel"
              yDomain={[0, 100]}
              yTickFormatter={(v) => `${v}%`}
              height={280}
              ariaLabel={district.centerDetail.attendance30Days}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              <MiniStat
                label={district.centerDetail.attendanceAverage}
                value={`${avgAttendance}%`}
                icon={<TrendingUp size={16} className="text-success" />}
              />
              <MiniStat
                label={district.centerDetail.bestDay}
                value={`${best.rate}% • ${/^\d{4}-\d{2}-\d{2}$/.test(best.date) ? formatDate(best.date) : best.date}`}
                icon={<CheckCircle2 size={16} className="text-success" />}
              />
              <MiniStat
                label={district.centerDetail.worstDay}
                value={`${worst.rate}% • ${/^\d{4}-\d{2}-\d{2}$/.test(worst.date) ? formatDate(worst.date) : worst.date}`}
                icon={<AlertTriangle size={16} className="text-warning" />}
              />
            </div>
          </Card>

          <Card padding="lg">
            <h3 className="text-subheading text-text mb-1">{district.centerDetail.enrollmentCombined}</h3>
            <p className="text-body text-text-secondary mb-4">
              {district.centerDetail.enrollmentCombinedSubtitle}
            </p>

            <EnhancedLineChart
              data={enrollmentChartData}
              series={enrollmentSeries}
              xDataKey="label"
              height={280}
              ariaLabel={district.centerDetail.enrollmentCombined}
            />
          </Card>
        </div>

        <div className="xl:col-span-1 space-y-4">
          <Card padding="lg">
            <h3 className="text-subheading text-text mb-3">{district.centerDetail.schoolHealth}</h3>
            <ul className="space-y-2">
              <HealthItem
                ok={attendanceOk}
                warn={!attendanceOk}
                text={
                  attendanceOk
                    ? district.centerDetail.healthAttendanceGood
                    : attendanceRisk
                      ? district.centerDetail.healthAttendanceBad
                      : district.centerDetail.healthAttendanceFollowup
                }
              />
              <HealthItem
                ok={!dropoutsRisk}
                warn={dropoutsRisk}
                text={dropoutsRisk ? district.centerDetail.healthDropoutsRising : district.centerDetail.healthDropoutsStable}
              />
              <HealthItem
                ok={enrollmentOk}
                warn={!enrollmentOk}
                text={enrollmentOk ? district.centerDetail.healthEnrollmentUp : district.centerDetail.healthEnrollmentDown}
              />
              <HealthItem
                ok={!staleRisk}
                warn={staleRisk}
                text={staleRisk ? district.centerDetail.healthStaleData : district.centerDetail.healthDataFresh}
              />
            </ul>
          </Card>

          <Card padding="lg">
            <h3 className="text-subheading text-text mb-3">{district.centerDetail.alertsTitle}</h3>
            {alertsToShow.length === 0 ? (
              <p className="text-body text-text-secondary">{district.centerDetail.noAlerts}</p>
            ) : (
              <ul className="space-y-2">
                {alertsToShow.map((a, idx) => (
                  <li
                    key={`${a.text}-${idx}`}
                    className="flex items-start gap-2 p-3 rounded-lg border border-border bg-background-subtle/50"
                  >
                    <span
                      className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${
                        a.level === 'high' ? 'bg-error' : 'bg-warning'
                      }`}
                      aria-hidden="true"
                    />
                    <p className="text-body text-text">{a.text}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card padding="lg">
            <h3 className="text-subheading text-text mb-3">{district.centerDetail.recentTimelineTitle}</h3>
            <ol className="space-y-3">
              {timelineItems.map((item) => (
                <li key={item.label} className="flex gap-3">
                  <span className="mt-1 w-2.5 h-2.5 rounded-full bg-primary shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-caption font-semibold text-text-secondary uppercase tracking-wide">
                      {item.label}
                    </p>
                    <p className="text-body text-text">{item.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card padding="lg">
          <h3 className="text-subheading text-text mb-4">{district.centerDetail.schoolInfo}</h3>
          <dl className="space-y-0">
            <InfoRow icon={<User size={18} />} label={district.centerDetail.caretaker} value={center.caretaker} />
            <InfoRow
              icon={<Phone size={18} />}
              label={district.centerDetail.phone}
              value={center.caretakerPhone ?? '—'}
            />
            <InfoRow icon={<MapPin size={18} />} label={district.centers.sector} value={center.sector} />
            <InfoRow icon={<MapPin size={18} />} label={district.centers.cell} value={center.cell} />
            <InfoRow
              icon={<Building2 size={18} />}
              label={district.settings.districtName}
              value={user?.districtName ?? '—'}
            />
          </dl>
        </Card>

        <GisEmbed
          title={district.centerDetail.location}
          description={center.name}
          height="220px"
          headerAction={
            <Link to="/district/ikarita">
              <Button variant="tertiary" size="sm" icon={<Map size={16} />}>
                {district.centerDetail.viewLargeMap}
              </Button>
            </Link>
          }
        />
      </div>

      <Card padding="lg">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="text-subheading text-text">{district.centerDetail.recommendedActionsTitle}</h3>
          <span className="shrink-0 text-text-muted" aria-hidden="true">
            <ClipboardList size={20} />
          </span>
        </div>
        <ul className="space-y-2">
          {recommendedActions.map((a) => (
            <li key={a} className="flex items-start gap-2">
              <span className="mt-1 text-primary shrink-0" aria-hidden="true">
                <Activity size={16} />
              </span>
              <p className="text-body text-text">{a}</p>
            </li>
          ))}
        </ul>
      </Card>
    </DistrictLayout>
  )
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-0">
      <span className="text-text-muted shrink-0">{icon}</span>
      <dt className="text-body text-text-secondary flex-1">{label}</dt>
      <dd className="text-body font-semibold text-text text-right">{value}</dd>
    </div>
  )
}

function MiniStat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-background-subtle/40 p-3">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 text-text-muted shrink-0" aria-hidden="true">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-caption font-semibold text-text-secondary uppercase tracking-wide">{label}</p>
          <p className="text-body font-semibold text-text mt-1">{value}</p>
        </div>
      </div>
    </div>
  )
}

function HealthItem({ ok, warn, text }: { ok: boolean; warn: boolean; text: string }) {
  const Icon = ok ? CheckCircle2 : AlertTriangle
  const iconClass = ok ? 'text-success' : warn ? 'text-warning' : 'text-text-muted'
  return (
    <li className="flex items-start gap-2">
      <span className={`mt-0.5 shrink-0 ${iconClass}`} aria-hidden="true">
        <Icon size={16} />
      </span>
      <p className="text-body text-text">{text}</p>
    </li>
  )
}
