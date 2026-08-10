import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CaretakerLayout } from '@/layouts/CaretakerLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { FeedingMonthSummaryForm } from '@/components/feeding/FeedingMonthSummaryForm'
import { useAuth, useData } from '@/contexts/AppContext'
import { useToast } from '@/components/ui/Toast'
import { caretaker } from '@/locales/rw/caretaker'
import {
  computeFeedingDayCounts,
  getCurrentYearMonth,
  getFeedingDaysForMonth,
} from '@/lib/feeding-utils'
import { resolveCenterId } from '@/lib/resolve-center-id'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { common } from '@/locales/rw/common'
import { messageForMutationFailure } from '@/offline/mutation-error-message'
import { env } from '@/config/env'

export function ImirireMonthlyPage() {
  const { user } = useAuth()
  const { feedingDays, getFeedingMonthSummary, upsertFeedingMonthSummary } = useData()
  const { showSuccess, showError } = useToast()
  const centerId = resolveCenterId(user?.centerId)

  const [yearMonth, setYearMonth] = useState(getCurrentYearMonth())
  const [milkLiters, setMilkLiters] = useState('0')
  const [flourKg, setFlourKg] = useState('0')
  const [foodSource, setFoodSource] = useState('')

  const monthDays = useMemo(
    () => (centerId ? getFeedingDaysForMonth(feedingDays, centerId, yearMonth) : []),
    [feedingDays, centerId, yearMonth],
  )
  const counts = useMemo(() => computeFeedingDayCounts(monthDays), [monthDays])
  const existing = useMemo(
    () => (centerId ? getFeedingMonthSummary(centerId, yearMonth) : undefined),
    [getFeedingMonthSummary, centerId, yearMonth],
  )

  useEffect(() => {
    if (existing) {
      setMilkLiters(String(existing.milkLiters))
      setFlourKg(String(existing.flourKg))
      setFoodSource(existing.foodSource)
    } else {
      setMilkLiters('0')
      setFlourKg('0')
      setFoodSource('')
    }
  }, [existing, yearMonth])

  const handleSave = async () => {
    if (!centerId) return
    try {
      await upsertFeedingMonthSummary({
        centerId,
        yearMonth,
        milkLiters: Number(milkLiters) || 0,
        flourKg: Number(flourKg) || 0,
        foodSource,
        updatedBy: user?.name,
      })
      showSuccess(env.isLive ? common.sync.savedOnDevice : caretaker.imirire.summarySaved)
    } catch (err) {
      showError(messageForMutationFailure(err))
    }
  }

  if (!centerId) {
    return (
      <CaretakerLayout backTo="/caretaker/imirire" backLabel={caretaker.nav.imirire}>
        <PageContainer>
          <PageHeader
            title={caretaker.imirire.monthlySummary}
            description={caretaker.imirire.subtitle}
          />
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
    <CaretakerLayout backTo="/caretaker/imirire" backLabel={caretaker.nav.imirire}>
      <PageContainer>
        <PageHeader
          title={caretaker.imirire.monthlySummary}
          description={caretaker.imirire.subtitle}
          action={
            <Link to="/caretaker/imirire" className="w-full sm:w-auto">
              <Button variant="secondary" size="md" className="w-full sm:w-auto">
                {caretaker.imirire.viewDaily}
              </Button>
            </Link>
          }
        />
        <PageContent className="space-y-6">
          <Card padding="lg">
            <FeedingMonthSummaryForm
              yearMonth={yearMonth}
              onYearMonthChange={setYearMonth}
              counts={counts}
              milkLiters={milkLiters}
              flourKg={flourKg}
              foodSource={foodSource}
              onMilkLitersChange={setMilkLiters}
              onFlourKgChange={setFlourKg}
              onFoodSourceChange={setFoodSource}
              onSave={handleSave}
            />
          </Card>
        </PageContent>
      </PageContainer>
    </CaretakerLayout>
  )
}
