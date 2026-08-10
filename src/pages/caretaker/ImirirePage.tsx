import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CaretakerLayout } from '@/layouts/CaretakerLayout'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { Alert } from '@/components/ui/Alert'
import { FeedingDayForm } from '@/components/feeding/FeedingDayForm'
import { FeedingMonthGrid } from '@/components/feeding/FeedingMonthGrid'
import { useAuth, useData } from '@/contexts/AppContext'
import { useToast } from '@/components/ui/Toast'
import { caretaker } from '@/locales/rw/caretaker'
import {
  emptyComposition,
  getCurrentYearMonth,
  getFeedingDaysForMonth,
  isBalancedComposition,
} from '@/lib/feeding-utils'
import { getTodayDate } from '@/lib/nutrition-utils'
import { resolveCenterId } from '@/lib/resolve-center-id'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { common } from '@/locales/rw/common'
import { messageForMutationFailure } from '@/offline/mutation-error-message'
import { env } from '@/config/env'
import type { BalancedMealComposition } from '@/types'

export function ImirirePage() {
  const { user } = useAuth()
  const { feedingDays, getFeedingDay, upsertFeedingDay } = useData()
  const { showSuccess, showError } = useToast()
  const centerId = resolveCenterId(user?.centerId)
  const today = getTodayDate()

  const [yearMonth, setYearMonth] = useState(getCurrentYearMonth)
  const [editorOpen, setEditorOpen] = useState(false)
  const [date, setDate] = useState(today)
  const [milkServed, setMilkServed] = useState(false)
  const [porridgeServed, setPorridgeServed] = useState(false)
  const [balancedMealServed, setBalancedMealServed] = useState(false)
  const [composition, setComposition] = useState<BalancedMealComposition>(emptyComposition())
  const [error, setError] = useState<string>()
  const [showBalancedValidation, setShowBalancedValidation] = useState(false)

  const monthDays = useMemo(
    () => (centerId ? getFeedingDaysForMonth(feedingDays, centerId, yearMonth) : []),
    [feedingDays, centerId, yearMonth],
  )

  const existing = useMemo(
    () => (centerId ? getFeedingDay(centerId, date) : undefined),
    [getFeedingDay, centerId, date],
  )

  useEffect(() => {
    if (!editorOpen) return
    if (existing) {
      setMilkServed(existing.milkServed)
      setPorridgeServed(existing.porridgeServed)
      setBalancedMealServed(existing.balancedMealServed)
      setComposition(existing.composition ?? emptyComposition())
    } else {
      setMilkServed(false)
      setPorridgeServed(false)
      setBalancedMealServed(false)
      setComposition(emptyComposition())
    }
    setError(undefined)
    setShowBalancedValidation(false)
  }, [existing, date, editorOpen])

  const openDayEditor = (dayDate: string) => {
    setDate(dayDate)
    setYearMonth(dayDate.slice(0, 7))
    setEditorOpen(true)
  }

  const handleBalancedChange = (v: boolean) => {
    setBalancedMealServed(v)
    setShowBalancedValidation(false)
    setError(undefined)
    if (!v) setComposition(emptyComposition())
  }

  const handleCompositionChange = (next: BalancedMealComposition) => {
    setComposition(next)
    if (isBalancedComposition(next)) {
      setShowBalancedValidation(false)
      setError(undefined)
    }
  }

  const handleSave = async () => {
    if (!centerId) {
      showError(common.live.missingCenterId)
      return
    }
    if (balancedMealServed && !isBalancedComposition(composition)) {
      setShowBalancedValidation(true)
      setError(caretaker.imirire.balancedIncomplete)
      showError(caretaker.imirire.balancedIncomplete)
      return
    }
    try {
      await upsertFeedingDay({
        centerId,
        date,
        milkServed,
        porridgeServed,
        balancedMealServed,
        composition: balancedMealServed ? composition : undefined,
        recordedBy: user?.name,
      })
      setError(undefined)
      setShowBalancedValidation(false)
      showSuccess(env.isLive ? common.sync.savedOnDevice : caretaker.imirire.daySaved)
      setEditorOpen(false)
    } catch (err) {
      showError(messageForMutationFailure(err))
    }
  }

  const todayRecord = centerId ? getFeedingDay(centerId, today) : undefined

  if (!centerId) {
    return (
      <CaretakerLayout>
        <PageContainer>
          <PageHeader title={caretaker.imirire.title} description={caretaker.imirire.subtitle} />
          <PageContent>
            <LiveUnavailableState
              title={common.live.missingCenterId}
              description={common.live.unavailableDesc}
            />
          </PageContent>
        </PageContainer>
      </CaretakerLayout>
    )
  }

  return (
    <CaretakerLayout>
      <PageContainer>
        <PageHeader
          title={caretaker.imirire.title}
          description={caretaker.imirire.subtitle}
          action={
            <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full sm:w-auto">
              <Button
                variant="primary"
                onClick={() => openDayEditor(today)}
                className="w-full sm:w-auto"
              >
                {todayRecord
                  ? caretaker.imirire.editDay
                  : caretaker.imirire.feedingPendingToday}
              </Button>
              <Link to="/caretaker/imirire/raporo" className="w-full sm:w-auto">
                <Button variant="secondary" className="w-full sm:w-auto">
                  {caretaker.imirire.viewMonthly}
                </Button>
              </Link>
            </div>
          }
        />

        <PageContent className="space-y-6">
          {todayRecord ? (
            <Alert variant="success">{caretaker.imirire.feedingCompleteToday}</Alert>
          ) : (
            <Alert variant="warning">{caretaker.imirire.feedingPendingToday}</Alert>
          )}

          <FeedingMonthGrid
            yearMonth={yearMonth}
            onYearMonthChange={setYearMonth}
            days={monthDays}
            today={today}
            onEditDay={openDayEditor}
            onMarkDay={openDayEditor}
          />

          <Modal
            open={editorOpen}
            onClose={() => setEditorOpen(false)}
            title={existing ? caretaker.imirire.editDayTitle : caretaker.imirire.markDayTitle}
            size="md"
          >
            <FeedingDayForm
              date={date}
              onDateChange={setDate}
              milkServed={milkServed}
              porridgeServed={porridgeServed}
              balancedMealServed={balancedMealServed}
              composition={composition}
              onMilkChange={setMilkServed}
              onPorridgeChange={setPorridgeServed}
              onBalancedChange={handleBalancedChange}
              onCompositionChange={handleCompositionChange}
              onSave={handleSave}
              error={error}
              dateLocked
              showBalancedValidation={showBalancedValidation}
            />
          </Modal>
        </PageContent>
      </PageContainer>
    </CaretakerLayout>
  )
}
