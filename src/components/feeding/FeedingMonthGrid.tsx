import { Check, CheckCircle2, Milk, Pencil, Plus, Soup, UtensilsCrossed } from 'lucide-react'
import { Card, StatCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { FormField, TextInput } from '@/components/ui/FormField'
import { caretaker } from '@/locales/rw/caretaker'
import { common } from '@/locales/rw/common'
import { computeFeedingDayCounts, daysInYearMonth } from '@/lib/feeding-utils'
import type { CenterFeedingDay } from '@/types'

function ServedMark({ served, label }: { served: boolean; label: string }) {
  return (
    <span
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${
        served
          ? 'bg-success-light text-success ring-1 ring-success/25'
          : 'bg-background-subtle text-text-muted'
      }`}
      aria-label={served ? `${label}: ✓` : `${label}: —`}
    >
      {served ? <Check size={16} strokeWidth={2.5} /> : <span className="text-caption">—</span>}
    </span>
  )
}

function ServedDots({ record }: { record?: CenterFeedingDay }) {
  const marks = [
    { on: !!record?.milkServed, label: caretaker.imirire.milk },
    { on: !!record?.porridgeServed, label: caretaker.imirire.porridge },
    { on: !!record?.balancedMealServed, label: caretaker.imirire.balancedMeal },
  ]
  return (
    <span className="flex items-center justify-center gap-0.5" aria-hidden>
      {marks.map((mark) => (
        <span
          key={mark.label}
          className={`h-1.5 w-1.5 rounded-full ${
            mark.on ? 'bg-primary' : 'bg-border'
          }`}
        />
      ))}
    </span>
  )
}

function mondayIndex(jsWeekday: number): number {
  return (jsWeekday + 6) % 7
}

function leadingMondayBlanks(yearMonth: string): number {
  const [year, month] = yearMonth.split('-').map(Number)
  return mondayIndex(new Date(year, month - 1, 1).getDay())
}

function dayStatusLabel(record: CenterFeedingDay | undefined, isFuture: boolean): string {
  if (isFuture) return caretaker.imirire.futureDay
  if (!record) return caretaker.imirire.dayNotLogged
  if (record.milkServed && record.porridgeServed && record.balancedMealServed) {
    return caretaker.imirire.dayComplete
  }
  return caretaker.imirire.dayPartial
}

export interface FeedingMonthGridProps {
  yearMonth: string
  onYearMonthChange: (yearMonth: string) => void
  days: CenterFeedingDay[]
  today: string
  onEditDay: (date: string) => void
  onMarkDay: (date: string) => void
}

export function FeedingMonthGrid({
  yearMonth,
  onYearMonthChange,
  days,
  today,
  onEditDay,
  onMarkDay,
}: FeedingMonthGridProps) {
  const dayCount = daysInYearMonth(yearMonth)
  const byDate = new Map(days.map((d) => [d.date, d]))
  const counts = computeFeedingDayCounts(days)
  const loggedDays = days.length
  const blanks = leadingMondayBlanks(yearMonth)

  const rows = Array.from({ length: dayCount }, (_, i) => {
    const dayNum = i + 1
    const date = `${yearMonth}-${String(dayNum).padStart(2, '0')}`
    const record = byDate.get(date)
    return { dayNum, date, record }
  })

  const openDay = (date: string, hasRecord: boolean) => {
    if (date > today) return
    if (hasRecord) onEditDay(date)
    else onMarkDay(date)
  }

  return (
    <div className="space-y-4">
      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        role="group"
        aria-label={caretaker.imirire.monthGrid}
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
        <StatCard
          label={caretaker.imirire.loggedDays}
          value={`${loggedDays}/${dayCount}`}
          icon={<CheckCircle2 size={18} className="text-primary" />}
          variant={loggedDays > 0 ? 'success' : 'default'}
          compact
        />
      </div>

      <Card padding="lg" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h2 className="text-subheading text-text">{caretaker.imirire.monthGrid}</h2>
            <p className="text-caption text-text-secondary mt-0.5">
              {caretaker.imirire.monthGridHint}
            </p>
          </div>
          <div className="sm:w-48">
            <FormField label={caretaker.growth.selectMonth}>
              <TextInput
                type="month"
                value={yearMonth}
                onChange={(e) => onYearMonthChange(e.target.value)}
              />
            </FormField>
          </div>
        </div>

        <div className="md:hidden space-y-2" aria-label={caretaker.imirire.calendarLabel}>
          <div className="grid grid-cols-7 gap-1">
            {caretaker.imirire.weekdaysMonFirst.map((label) => (
              <span
                key={label}
                className="text-center text-caption font-semibold uppercase tracking-wide text-text-secondary py-1"
              >
                {label}
              </span>
            ))}
            {Array.from({ length: blanks }, (_, i) => (
              <span key={`blank-${i}`} aria-hidden />
            ))}
            {rows.map(({ dayNum, date, record }) => {
              const isToday = date === today
              const isFuture = date > today
              const hasRecord = !!record
              const fullyLogged =
                !!record?.milkServed &&
                !!record?.porridgeServed &&
                !!record?.balancedMealServed
              const status = dayStatusLabel(record, isFuture)
              const label = `${caretaker.imirire.day} ${dayNum}${
                isToday ? `, ${caretaker.imirire.today}` : ''
              }, ${status}`

              return (
                <button
                  key={date}
                  type="button"
                  id={isToday ? 'feeding-today-cell' : undefined}
                  disabled={isFuture}
                  onClick={() => openDay(date, hasRecord)}
                  aria-label={label}
                  aria-current={isToday ? 'date' : undefined}
                  className={`flex flex-col items-center justify-center gap-1 min-h-[3.25rem] rounded-xl border-2 px-1 py-1.5 transition-colors focus-visible:outline-3 focus-visible:outline-primary focus-visible:outline-offset-2 ${
                    isFuture
                      ? 'border-transparent bg-background-subtle/40 text-text-muted cursor-not-allowed opacity-50'
                      : isToday
                        ? 'border-primary bg-primary-light text-primary shadow-sm'
                        : fullyLogged
                          ? 'border-success/35 bg-success-light/25 text-text'
                          : hasRecord
                            ? 'border-warning/40 bg-warning-light/20 text-text'
                            : 'border-border bg-surface text-text hover:border-primary/40 hover:bg-primary-light/40'
                  }`}
                >
                  <span className="tabular-nums text-body font-semibold leading-none">{dayNum}</span>
                  {!isFuture && <ServedDots record={record} />}
                </button>
              )
            })}
          </div>
        </div>

        <div className="hidden md:block overflow-x-auto max-h-[min(65vh,560px)] overflow-y-auto rounded-lg border border-border">
          <table className="w-full min-w-[520px] text-left">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-border bg-background-subtle">
                <th className="text-caption font-semibold uppercase tracking-wide text-text-secondary px-3 py-3">
                  {caretaker.imirire.day}
                </th>
                <th className="text-caption font-semibold uppercase tracking-wide text-text-secondary px-3 py-3">
                  {caretaker.imirire.milk}
                </th>
                <th className="text-caption font-semibold uppercase tracking-wide text-text-secondary px-3 py-3">
                  {caretaker.imirire.porridge}
                </th>
                <th className="text-caption font-semibold uppercase tracking-wide text-text-secondary px-3 py-3">
                  {caretaker.imirire.balancedMeal}
                </th>
                <th className="text-caption font-semibold uppercase tracking-wide text-text-secondary px-3 py-3 text-right">
                  {common.labels.actions}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ dayNum, date, record }) => {
                const isToday = date === today
                const isFuture = date > today
                const hasRecord = !!record
                const fullyLogged =
                  !!record?.milkServed &&
                  !!record?.porridgeServed &&
                  !!record?.balancedMealServed

                return (
                  <tr
                    key={date}
                    id={isToday ? 'feeding-today-row' : undefined}
                    onClick={isFuture ? undefined : () => openDay(date, hasRecord)}
                    className={`border-b border-border last:border-0 transition-colors ${
                      isToday
                        ? 'bg-primary-light/50 ring-1 ring-inset ring-primary/20'
                        : fullyLogged
                          ? 'bg-success-light/15'
                          : hasRecord
                            ? 'bg-warning-light/10'
                            : isFuture
                              ? 'opacity-50'
                              : 'hover:bg-background-subtle/60'
                    } ${isFuture ? '' : 'cursor-pointer'}`}
                  >
                    <td className="py-3 px-3 text-body font-semibold text-text">
                      <span className="inline-flex items-center gap-2">
                        <span className="tabular-nums w-6">{dayNum}</span>
                        {isToday && (
                          <span className="rounded-full bg-primary !text-white px-2 py-0.5 text-[0.875rem] font-semibold">
                            {caretaker.imirire.today}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <ServedMark served={!!record?.milkServed} label={caretaker.imirire.milk} />
                    </td>
                    <td className="py-3 px-3">
                      <ServedMark
                        served={!!record?.porridgeServed}
                        label={caretaker.imirire.porridge}
                      />
                    </td>
                    <td className="py-3 px-3">
                      <ServedMark
                        served={!!record?.balancedMealServed}
                        label={caretaker.imirire.balancedMeal}
                      />
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-2 justify-end">
                        {isFuture ? null : hasRecord ? (
                          <Button
                            variant="tertiary"
                            size="sm"
                            icon={<Pencil size={14} />}
                            onClick={(e) => {
                              e.stopPropagation()
                              onEditDay(date)
                            }}
                          >
                            {caretaker.imirire.editDay}
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={<Plus size={14} />}
                            onClick={(e) => {
                              e.stopPropagation()
                              onMarkDay(date)
                            }}
                          >
                            {caretaker.imirire.markCompleted}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
