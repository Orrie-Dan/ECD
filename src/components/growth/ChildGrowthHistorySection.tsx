import { Ruler } from 'lucide-react'
import { Card, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { NutritionStatusCard } from '@/components/growth/NutritionStatusCard'
import { AssessmentReminderCard } from '@/components/growth/AssessmentReminderCard'
import { MeasurementHistoryTable } from '@/components/growth/MeasurementHistoryTable'
import { GrowthTrendChart } from '@/components/growth/GrowthTrendChart'
import { caretaker } from '@/locales/rw/caretaker'
import { sortMeasurementsDesc } from '@/lib/nutrition-utils'
import type {
  Child,
  GrowthMeasurement,
  NutritionAssessment,
} from '@/types'

interface ChildGrowthHistorySectionProps {
  child: Child
  measurements: GrowthMeasurement[]
  assessments: NutritionAssessment[]
  canEdit?: boolean
  onRecordMeasurement?: () => void
  onEditMeasurement?: (record: GrowthMeasurement) => void
}

function formatDelta(value: number, unit: string): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value} ${unit}`
}

export function ChildGrowthHistorySection({
  child,
  measurements,
  assessments,
  canEdit = false,
  onRecordMeasurement,
  onEditMeasurement,
}: ChildGrowthHistorySectionProps) {
  const sorted = sortMeasurementsDesc(measurements)
  const latestMeasurement = sorted[0]
  const latestAssessment = [...assessments].sort(
    (a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id),
  )[0]
  const previous = sorted[1]
  const weightDelta =
    latestMeasurement && previous
      ? Number((latestMeasurement.weightKg - previous.weightKg).toFixed(1))
      : null
  const muacDelta =
    latestMeasurement && previous
      ? Number((latestMeasurement.muacCm - previous.muacCm).toFixed(1))
      : null

  return (
    <div className="space-y-4">
      {canEdit && onRecordMeasurement && (
        <div className="flex justify-end">
          <Button
            variant="primary"
            size="md"
            icon={<Ruler size={18} />}
            onClick={onRecordMeasurement}
            className="w-full sm:w-auto"
          >
            {caretaker.growth.recordMeasurement}
          </Button>
        </div>
      )}

      {/* Current nutrition status + next assessment — alerts first */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <NutritionStatusCard
          measurement={latestMeasurement}
          assessment={latestAssessment}
        />
        <AssessmentReminderCard latestDate={latestMeasurement?.date} />
      </div>

      {/* Weight / MUAC change since last visit */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          label={caretaker.growth.latestWeight}
          value={latestMeasurement ? `${latestMeasurement.weightKg} kg` : '—'}
          trend={weightDelta != null ? formatDelta(weightDelta, 'kg') : undefined}
          variant={
            weightDelta == null ? 'default' : weightDelta >= 0 ? 'success' : 'warning'
          }
        />
        <StatCard
          label={caretaker.growth.latestMuac}
          value={latestMeasurement ? `${latestMeasurement.muacCm} cm` : '—'}
          trend={muacDelta != null ? formatDelta(muacDelta, 'cm') : undefined}
          variant={muacDelta == null ? 'default' : muacDelta >= 0 ? 'success' : 'warning'}
        />
      </div>

      {/* Trend visualization */}
      <Card padding="lg">
        <h3 className="text-label text-primary mb-1">{caretaker.growth.trendTitle}</h3>
        <p className="text-caption text-text-secondary mb-4">
          {caretaker.growth.weightHistory} · {caretaker.growth.muacHistory}
        </p>
        <GrowthTrendChart measurements={measurements} />
      </Card>

      {/* Measurement history table */}
      <MeasurementHistoryTable
        records={measurements}
        resetDeps={[child.id]}
        canEdit={canEdit}
        onEdit={onEditMeasurement}
        highlightLatest
      />
    </div>
  )
}
