import { Link } from 'react-router-dom'
import {
  ChevronRight,
  HandCoins,
  MessagesSquare,
  UsersRound,
  UserCog,
  HeartHandshake,
  DoorOpen,
  GraduationCap,
  type LucideIcon,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { useDirectorRegisterOverview } from '@/features/caretaker/director-register-overview'
import { caretaker } from '@/locales/rw/caretaker'
import { CARETAKER_PATHS } from '@/layouts/caretaker/navigation'
import { formatRegisterCount } from '@/lib/register-format'

const copy = caretaker.director.registerOverview

interface OverviewTileProps {
  to: string
  icon: LucideIcon
  label: string
  value: string
  detail?: string
  emptyDetail?: string
}

function OverviewTile({ to, icon: Icon, label, value, detail, emptyDetail }: OverviewTileProps) {
  const support = detail?.trim() || emptyDetail || copy.noneThisMonth

  return (
    <Link
      to={to}
      className="block rounded-xl focus-visible:outline-3 focus-visible:outline-primary focus-visible:outline-offset-2"
    >
      <Card
        elevated
        padding="md"
        className="border border-border hover:border-primary/30 transition-colors group"
      >
        <div className="flex items-start gap-3">
          <span
            className="flex items-center justify-center w-11 h-11 rounded-xl bg-background-subtle border border-border text-primary shrink-0 transition-transform group-hover:scale-105"
            aria-hidden="true"
          >
            <Icon size={22} strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-caption font-semibold text-text-muted">{label}</p>
            <p className="text-subheading text-text mt-0.5 wrap-break-word">{value}</p>
            <p className="text-body text-text-secondary mt-1 line-clamp-2 wrap-break-word">
              {support}
            </p>
            <p className="text-caption font-semibold text-primary mt-2 group-hover:underline">
              {copy.viewRegister}
            </p>
          </div>
          <ChevronRight
            size={20}
            className="text-text-muted shrink-0 mt-1"
            aria-hidden="true"
          />
        </div>
      </Card>
    </Link>
  )
}

function OverviewSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2" aria-busy="true" aria-label={copy.loading}>
      {Array.from({ length: 7 }).map((_, i) => (
        <Skeleton key={i} height="7.5rem" rounded="lg" className="w-full" />
      ))}
    </div>
  )
}

export function DirectorRegisterOverview({ centerId }: { centerId: string }) {
  const data = useDirectorRegisterOverview(centerId)

  if (data.isLoading) {
    return <OverviewSkeleton />
  }

  if (data.isError) {
    return (
      <LiveUnavailableState
        title={copy.error}
        action={
          <Button variant="secondary" size="sm" onClick={() => data.refetch()}>
            {copy.retry}
          </Button>
        }
      />
    )
  }

  const trainingValue =
    data.trainingCoverage.totalCaregivers > 0
      ? data.trainingCoverage.percent
      : copy.trainingCoverageEmpty

  const trainingDetail =
    data.trainingCoverage.totalCaregivers > 0
      ? copy.trainingCoverageDetail
          .replace('{trained}', formatRegisterCount(data.trainingCoverage.trainedCount))
          .replace('{total}', formatRegisterCount(data.trainingCoverage.totalCaregivers))
      : copy.noneRecorded

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <OverviewTile
        to={CARETAKER_PATHS.bookParentContributions}
        icon={HandCoins}
        label={copy.contributions}
        value={formatRegisterCount(data.contributions.parentsCount)}
        detail={copy.contributionsDetail
          .replace('{count}', formatRegisterCount(data.contributions.parentsCount))
          .replace('{cash}', data.contributions.cashTotal)}
      />
      <OverviewTile
        to={CARETAKER_PATHS.bookEnvironmentTalks}
        icon={MessagesSquare}
        label={copy.latestParenting}
        value={
          data.latestParenting.hasRecord
            ? data.latestParenting.label
            : copy.noneThisMonth
        }
        detail={data.latestParenting.hasRecord ? data.latestParenting.detail : undefined}
        emptyDetail={copy.noneThisMonth}
      />
      <OverviewTile
        to={CARETAKER_PATHS.bookCommittee}
        icon={UsersRound}
        label={copy.committeeCount}
        value={formatRegisterCount(data.committeeActiveCount)}
      />
      <OverviewTile
        to={CARETAKER_PATHS.bookStaff}
        icon={UserCog}
        label={copy.activeCaregivers}
        value={formatRegisterCount(data.activeCaregiversCount)}
      />
      <OverviewTile
        to={CARETAKER_PATHS.bookSupport}
        icon={HeartHandshake}
        label={copy.latestSupport}
        value={
          data.latestSupport.hasRecord ? data.latestSupport.label : copy.noneThisMonth
        }
        detail={data.latestSupport.hasRecord ? data.latestSupport.detail : undefined}
        emptyDetail={copy.noneThisMonth}
      />
      <OverviewTile
        to={CARETAKER_PATHS.bookVisitors}
        icon={DoorOpen}
        label={copy.latestVisitor}
        value={
          data.latestVisitor.hasRecord ? data.latestVisitor.label : copy.noneThisMonth
        }
        detail={data.latestVisitor.hasRecord ? data.latestVisitor.detail : undefined}
        emptyDetail={copy.noneThisMonth}
      />
      <OverviewTile
        to={CARETAKER_PATHS.bookTraining}
        icon={GraduationCap}
        label={copy.trainingCoverage}
        value={trainingValue}
        detail={trainingDetail}
        emptyDetail={copy.trainingCoverageEmpty}
      />
    </div>
  )
}
