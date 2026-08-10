import { Calculator, Milk, Soup, UtensilsCrossed } from 'lucide-react'
import { FormField, TextInput, TextArea } from '@/components/ui/FormField'
import { Button } from '@/components/ui/Button'
import { Card, StatCard } from '@/components/ui/Card'
import { caretaker } from '@/locales/rw/caretaker'
import type { FeedingDayCounts } from '@/lib/feeding-utils'

interface FeedingMonthSummaryFormProps {
  yearMonth: string
  onYearMonthChange: (v: string) => void
  counts: FeedingDayCounts
  milkLiters: string
  flourKg: string
  foodSource: string
  onMilkLitersChange: (v: string) => void
  onFlourKgChange: (v: string) => void
  onFoodSourceChange: (v: string) => void
  onSave: () => void
}

export function FeedingMonthSummaryForm({
  yearMonth,
  onYearMonthChange,
  counts,
  milkLiters,
  flourKg,
  foodSource,
  onMilkLitersChange,
  onFlourKgChange,
  onFoodSourceChange,
  onSave,
}: FeedingMonthSummaryFormProps) {
  return (
    <div className="space-y-6">
      <FormField label={caretaker.growth.selectMonth}>
        <TextInput
          type="month"
          value={yearMonth}
          onChange={(e) => onYearMonthChange(e.target.value)}
          className="sm:max-w-xs"
        />
      </FormField>

      <section className="space-y-3">
        <div>
          <h2 className="text-subheading text-text flex items-center gap-2">
            <Calculator size={18} className="text-primary" aria-hidden />
            {caretaker.imirire.autoCounts}
          </h2>
          <p className="text-caption text-text-muted mt-1">
            {caretaker.imirire.autoCalculated}
          </p>
        </div>
        <div
          className="grid grid-cols-1 sm:grid-cols-3 gap-3"
          role="group"
          aria-label={caretaker.imirire.autoCounts}
        >
          <StatCard
            label={caretaker.imirire.milkDays}
            value={counts.milkDays}
            icon={<Milk size={18} className="text-secondary" />}
            variant="info"
            compact
          />
          <StatCard
            label={caretaker.imirire.porridgeDays}
            value={counts.porridgeDays}
            icon={<Soup size={18} className="text-warning" />}
            variant="warning"
            compact
          />
          <StatCard
            label={caretaker.imirire.balancedDays}
            value={counts.balancedDays}
            icon={<UtensilsCrossed size={18} className="text-success" />}
            variant="success"
            compact
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-subheading text-text">{caretaker.imirire.monthlySummary}</h2>
        <Card padding="md" className="bg-background-subtle/50 border-dashed">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={caretaker.imirire.milkLiters}>
              <TextInput
                type="number"
                min={0}
                step="0.1"
                value={milkLiters}
                onChange={(e) => onMilkLitersChange(e.target.value)}
                className="tabular-nums"
              />
            </FormField>
            <FormField label={caretaker.imirire.flourKg}>
              <TextInput
                type="number"
                min={0}
                step="0.1"
                value={flourKg}
                onChange={(e) => onFlourKgChange(e.target.value)}
                className="tabular-nums"
              />
            </FormField>
            <div className="sm:col-span-2">
              <FormField label={caretaker.imirire.foodSource}>
                <TextArea
                  value={foodSource}
                  placeholder={caretaker.imirire.foodSourcePlaceholder}
                  onChange={(e) => onFoodSourceChange(e.target.value)}
                  rows={2}
                />
              </FormField>
            </div>
          </div>
        </Card>
      </section>

      <Button variant="primary" size="md" className="w-full sm:w-auto" onClick={onSave}>
        {caretaker.imirire.saveSummary}
      </Button>
    </div>
  )
}
