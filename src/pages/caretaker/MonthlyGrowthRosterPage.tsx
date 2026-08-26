import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, Clock, Pencil, Ruler, Users, Eye } from 'lucide-react'
import { ClassroomCards } from '@/components/classrooms/ClassroomCards'
import { ClassroomBackLink } from '@/components/classrooms/ClassroomBackLink'
import { useClassroomGateway } from '@/hooks/useClassroomGateway'
import { CaretakerLayout } from '@/layouts/CaretakerLayout'
import { Card, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { GrowthRosterCard } from '@/components/growth/GrowthRosterCard'
import { GrowthStatusBadge } from '@/components/growth/GrowthStatusBadge'
import {
  MeasurementDialog,
  type MeasurementDialogResult,
} from '@/components/growth/MeasurementDialog'
import { FormField, TextInput } from '@/components/ui/FormField'
import { Pagination } from '@/components/ui/Pagination'
import { SegmentedTabs } from '@/components/ui/SegmentedTabs'
import { useAuth, useData } from '@/contexts/AppContext'
import { useToast } from '@/components/ui/Toast'
import { usePagination } from '@/hooks/usePagination'
import { caretaker } from '@/locales/rw/caretaker'
import { buildChildDetailPath } from '@/lib/child-routes'
import { common, gender as genderLabels } from '@/locales/rw/common'
import { calculateAge, formatDate } from '@/lib/mock-data'
import {
  getCurrentYearMonth,
  getLatestAssessment,
  getLatestMeasurement,
  getMeasurementForMonth,
  partitionGrowthRoster,
  toYearMonth,
} from '@/lib/nutrition-utils'
import type { Child } from '@/types'

type RosterView = 'pending' | 'measured' | 'all'

export function MonthlyGrowthRosterPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const {
    children,
    growthMeasurements,
    nutritionAssessments,
    recordMeasurement,
    updateMeasurement,
  } = useData()
  const { showSuccess, showError } = useToast()

  const [yearMonth, setYearMonth] = useState(getCurrentYearMonth())
  const [view, setView] = useState<RosterView>('pending')
  const [modalChild, setModalChild] = useState<Child | null>(null)

  const centerChildren = useMemo(
    () =>
      children.filter(
        (c) =>
          c.status === 'active' &&
          (!user?.centerId || c.centerId === user.centerId),
      ),
    [children, user?.centerId],
  )

  const { setSelectedGrade, gradeChildren: gradeCenterChildren, goBack, isGradeSelected } =
    useClassroomGateway(centerChildren)

  const { pending, measured } = useMemo(
    () => partitionGrowthRoster(gradeCenterChildren, growthMeasurements, yearMonth),
    [gradeCenterChildren, growthMeasurements, yearMonth],
  )

  const coverageRate =
    gradeCenterChildren.length === 0
      ? 0
      : Math.round((measured.length / gradeCenterChildren.length) * 100)

  const list = view === 'pending' ? pending : view === 'measured' ? measured : gradeCenterChildren

  const pagination = usePagination(list, { resetDeps: [view, yearMonth] })

  const existing = modalChild
    ? getMeasurementForMonth(growthMeasurements, modalChild.id, yearMonth)
    : undefined

  const fallbackHeight = modalChild
    ? getLatestMeasurement(growthMeasurements, modalChild.id)?.heightCm ?? 0
    : 0

  const handleConfirm = async (result: MeasurementDialogResult) => {
    if (!modalChild) return

    if (toYearMonth(result.date) !== yearMonth) {
      showError(caretaker.growth.validationMonth)
      return
    }

    const monthRecord =
      existing ?? getMeasurementForMonth(growthMeasurements, modalChild.id, yearMonth)

    try {
      if (monthRecord) {
        await updateMeasurement(monthRecord.id, {
          date: result.date,
          weightKg: result.weightKg,
          heightCm: result.heightCm || monthRecord.heightCm,
          muacCm: result.muacCm,
          headCircumferenceCm: result.headCircumferenceCm,
          notes: result.notes,
          recordedBy: user?.name,
        })
        showSuccess(caretaker.growth.updated)
      } else {
        await recordMeasurement({
          childId: modalChild.id,
          date: result.date,
          weightKg: result.weightKg,
          heightCm: result.heightCm || fallbackHeight,
          muacCm: result.muacCm,
          headCircumferenceCm: result.headCircumferenceCm,
          notes: result.notes,
          recordedBy: user?.name,
        })
        showSuccess(caretaker.growth.saved)
      }
      setModalChild(null)
    } catch {
      // ApiErrorBridge toasts LIVE failures
    }
  }

  const openMeasurement = (child: Child) => {
    setModalChild(child)
  }

  const startSession = () => {
    setView('pending')
    const first = pending[0] ?? centerChildren[0]
    if (first) setModalChild(first)
  }

  const tabs: { id: RosterView; label: string; count: number }[] = [
    { id: 'pending', label: caretaker.growth.pendingMeasurement, count: pending.length },
    { id: 'measured', label: caretaker.growth.measuredThisMonth, count: measured.length },
    { id: 'all', label: caretaker.growth.allChildren, count: gradeCenterChildren.length },
  ]

  const progressLabel = caretaker.growth.progressOf
    .replace('{done}', String(measured.length))
    .replace('{total}', String(gradeCenterChildren.length))

  const goBackToClassrooms = () => {
    goBack()
    setView('pending')
  }

  return (
    <CaretakerLayout backTo="/caretaker/imikurire" backLabel={caretaker.nav.growth}>
      <PageContainer>
        {isGradeSelected && <ClassroomBackLink onClick={goBackToClassrooms} />}

        <PageHeader
          title={caretaker.growth.monthlyRoster}
          description={caretaker.growth.monthlyRosterDesc}
          action={
            <Button
              variant="primary"
              size="md"
              icon={<Ruler size={18} />}
              onClick={startSession}
              disabled={gradeCenterChildren.length === 0 || pending.length === 0}
              className="w-full sm:w-auto"
            >
              {caretaker.growth.startSession}
            </Button>
          }
        />

        <PageContent className="space-y-6">
      {!isGradeSelected ? (
          <ClassroomCards
            children={centerChildren}
            onSelect={setSelectedGrade}
          />
      ) : (
      <>
          <div
            className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-stretch"
            role="group"
            aria-label={caretaker.growth.sessionProgress}
          >
            <div className="h-full [&>div]:h-full">
              <StatCard
                label={caretaker.growth.pendingCount}
                value={pending.length}
                icon={<Clock size={18} className="text-warning" />}
                variant={pending.length > 0 ? 'warning' : 'success'}
                compact
              />
            </div>
            <div className="h-full [&>div]:h-full">
              <StatCard
                label={caretaker.growth.measuredCount}
                value={measured.length}
                icon={<CheckCircle2 size={18} className="text-success" />}
                variant="success"
                compact
              />
            </div>
            <div className="h-full [&>div]:h-full">
              <StatCard
                label={common.labels.child}
                value={centerChildren.length}
                icon={<Users size={18} className="text-primary" />}
                compact
              />
            </div>
            <div className="h-full [&>div]:h-full">
              <StatCard
                label={caretaker.growth.coverageThisMonth}
                value={`${coverageRate}%`}
                icon={<Ruler size={18} className="text-secondary" />}
                variant={coverageRate >= 70 ? 'success' : 'warning'}
                compact
              />
            </div>
          </div>

          <Card padding="lg" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="flex-1 min-w-0 sm:max-w-xs">
                <FormField label={caretaker.growth.selectMonth}>
                  <TextInput
                    type="month"
                    value={yearMonth}
                    onChange={(e) => setYearMonth(e.target.value)}
                    className="!min-h-11 sm:!min-h-12"
                  />
                </FormField>
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-caption font-semibold uppercase tracking-wide text-text-secondary">
                    {caretaker.growth.sessionProgress}
                  </p>
                  <p className="text-caption font-medium text-text tabular-nums">{progressLabel}</p>
                </div>
                <div
                  className="h-2.5 rounded-full bg-background-subtle overflow-hidden"
                  role="progressbar"
                  aria-valuenow={coverageRate}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={progressLabel}
                >
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      coverageRate >= 70
                        ? 'bg-success'
                        : coverageRate > 0
                          ? 'bg-warning'
                          : 'bg-border'
                    }`}
                    style={{ width: `${coverageRate}%` }}
                  />
                </div>
              </div>
            </div>

            <SegmentedTabs
              options={tabs.map((tab) => ({
                id: tab.id,
                label: (
                  <>
                    {tab.label}
                    <span className="ml-1.5 tabular-nums opacity-80">({tab.count})</span>
                  </>
                ),
              }))}
              value={view}
              onChange={setView}
              aria-label={caretaker.growth.monthlyRoster}
              columns={3}
            />
          </Card>

          {gradeCenterChildren.length === 0 ? (
            <EmptyState
              icon={<Users size={48} className="text-text-muted" strokeWidth={1.5} />}
              title={caretaker.growth.noChildrenRoster}
              description={caretaker.growth.noChildrenRosterDesc}
              action={
                <Link to="/caretaker/abana">
                  <Button variant="primary" size="md">
                    {caretaker.nav.children}
                  </Button>
                </Link>
              }
            />
          ) : pagination.items.length === 0 ? (
            <EmptyState
              icon={
                view === 'pending' ? (
                  <CheckCircle2 size={48} className="text-success" strokeWidth={1.5} />
                ) : (
                  <Ruler size={48} className="text-text-muted" strokeWidth={1.5} />
                )
              }
              title={
                view === 'pending' ? caretaker.growth.noPending : caretaker.growth.noMeasurements
              }
              description={view === 'pending' ? caretaker.growth.noPendingDesc : undefined}
              action={
                view === 'pending' ? (
                  <Button variant="secondary" size="md" onClick={() => setView('measured')}>
                    {caretaker.growth.measuredThisMonth}
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <div className="space-y-3 sm:hidden" role="tabpanel">
                {pagination.items.map((child) => {
                  const monthMeasurement = getMeasurementForMonth(
                    growthMeasurements,
                    child.id,
                    yearMonth,
                  )
                  const lastMeasurement = getLatestMeasurement(growthMeasurements, child.id)
                  const assessment = getLatestAssessment(nutritionAssessments, child.id)
                  return (
                    <GrowthRosterCard
                      key={child.id}
                      child={child}
                      monthMeasurement={monthMeasurement}
                      lastMeasurement={lastMeasurement}
                      nutritionStatus={assessment?.status}
                      onRecord={() => openMeasurement(child)}
                    />
                  )
                })}
              </div>

              <Card padding="lg" className="hidden sm:block" role="tabpanel">
                <div className="overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0 max-h-[min(70vh,640px)] overflow-y-auto">
                  <table className="w-full min-w-0 text-left responsive-table-cards">
                    <thead className="sticky top-0 z-10 bg-surface">
                      <tr className="border-b border-border">
                        <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                          {caretaker.growth.child}
                        </th>
                        <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                          {caretaker.growth.ageYears}
                        </th>
                        <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                          {common.labels.gender}
                        </th>
                        <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                          {caretaker.growth.lastMeasurement}
                        </th>
                        <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                          {caretaker.growth.weightShort}
                        </th>
                        <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                          {caretaker.growth.heightShort}
                        </th>
                        <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                          {caretaker.growth.muacShort}
                        </th>
                        <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                          {caretaker.growth.statusColumn}
                        </th>
                        <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                          {caretaker.growth.measuredThisMonth}
                        </th>
                        <th className="text-caption font-semibold text-text-muted pb-3">
                          {common.labels.actions}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagination.items.map((child) => {
                        const monthMeasurement = getMeasurementForMonth(
                          growthMeasurements,
                          child.id,
                          yearMonth,
                        )
                        const lastMeasurement = getLatestMeasurement(
                          growthMeasurements,
                          child.id,
                        )
                        const assessment = getLatestAssessment(
                          nutritionAssessments,
                          child.id,
                        )
                        const complete = !!monthMeasurement
                        const lastDate = lastMeasurement?.date
                        return (
                          <tr
                            key={child.id}
                            className={`border-b border-border last:border-0 transition-colors hover:bg-background-subtle/60 ${
                              !complete ? 'bg-warning-light/15' : ''
                            }`}
                          >
                            <td
                              className="py-3 pr-4 text-body font-semibold text-text"
                              data-label={caretaker.growth.child}
                            >
                              {child.fullName}
                            </td>
                            <td
                              className="py-3 pr-4 text-body tabular-nums text-text-secondary"
                              data-label={caretaker.growth.ageYears}
                            >
                              {calculateAge(child.dateOfBirth)}
                            </td>
                            <td
                              className="py-3 pr-4 text-body text-text-secondary"
                              data-label={common.labels.gender}
                            >
                              {genderLabels[child.gender]}
                            </td>
                            <td
                              className="py-3 pr-4 text-body text-text-secondary"
                              data-label={caretaker.growth.lastMeasurement}
                            >
                              {lastDate ? formatDate(lastDate) : '—'}
                            </td>
                            <td
                              className="py-3 pr-4 text-body font-medium tabular-nums"
                              data-label={caretaker.growth.weightShort}
                            >
                              {monthMeasurement ? `${monthMeasurement.weightKg}` : '—'}
                            </td>
                            <td
                              className="py-3 pr-4 text-body font-medium tabular-nums"
                              data-label={caretaker.growth.heightShort}
                            >
                              {monthMeasurement && monthMeasurement.heightCm > 0
                                ? `${monthMeasurement.heightCm}`
                                : '—'}
                            </td>
                            <td
                              className="py-3 pr-4 text-body font-medium tabular-nums"
                              data-label={caretaker.growth.muacShort}
                            >
                              {monthMeasurement ? `${monthMeasurement.muacCm}` : '—'}
                            </td>
                            <td className="py-3 pr-4" data-label={caretaker.growth.statusColumn}>
                              {assessment ? (
                                <GrowthStatusBadge status={assessment.status} />
                              ) : (
                                <span className="text-text-muted">—</span>
                              )}
                            </td>
                            <td
                              className="py-3 pr-4"
                              data-label={caretaker.growth.measuredThisMonth}
                            >
                              <Badge variant={complete ? 'success' : 'warning'} size="sm">
                                {complete
                                  ? caretaker.growth.monthComplete
                                  : caretaker.growth.monthIncomplete}
                              </Badge>
                            </td>
                            <td className="py-3 td-actions" data-label="">
                              <div className="flex flex-wrap gap-2 justify-end">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  icon={
                                    complete ? <Pencil size={14} /> : <Ruler size={14} />
                                  }
                                  onClick={() => openMeasurement(child)}
                                  aria-label={`${complete ? caretaker.growth.editMeasurement : caretaker.growth.markMeasured}: ${child.fullName}`}
                                >
                                  {complete
                                    ? caretaker.growth.editMeasurement
                                    : caretaker.growth.markMeasured}
                                </Button>
                                <Button
                                  variant="tertiary"
                                  size="sm"
                                  icon={<Eye size={14} />}
                                  onClick={() =>
                                    navigate(buildChildDetailPath('/caretaker/abana', child, 'growth'))
                                  }
                                  aria-label={`${caretaker.growth.viewHistory}: ${child.fullName}`}
                                >
                                  {caretaker.growth.viewHistory}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Pagination
                page={pagination.page}
                pageSize={pagination.pageSize}
                total={pagination.total}
                totalPages={pagination.totalPages}
                startIndex={pagination.startIndex}
                endIndex={pagination.endIndex}
                hasPrevious={pagination.hasPrevious}
                hasNext={pagination.hasNext}
                onPageChange={pagination.setPage}
                onPageSizeChange={pagination.setPageSize}
                pageSizeSelectId="growth-roster-page-size"
              />
            </>
          )}
      </>
      )}
        </PageContent>
      </PageContainer>

      <MeasurementDialog
        open={!!modalChild}
        child={modalChild}
        existing={existing}
        sessionYearMonth={yearMonth}
        fallbackHeightCm={fallbackHeight}
        onClose={() => setModalChild(null)}
        onConfirm={handleConfirm}
      />
    </CaretakerLayout>
  )
}
