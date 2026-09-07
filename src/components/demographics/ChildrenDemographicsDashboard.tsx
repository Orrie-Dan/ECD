import { useMemo, useState, type ReactNode } from 'react'
import { StatCard, Card } from '@/components/ui/Card'
import { SegmentedTabs } from '@/components/ui/SegmentedTabs'
import { Button } from '@/components/ui/Button'
import {
  ChartFullscreenPanel,
  EnhancedBarChart,
  formatCountTick,
} from '@/components/charts'
import { DEMOGRAPHIC_CHART_COLORS } from '@/lib/chart-theme'
import type {
  ChildrenDemographicsViewModel,
  DemographicSlice,
} from '@/models/children-demographics'
import { demographicsCopy } from '@/locales/rw/demographics'

type ChildrenChartTab = 'total' | 'byDistrict'

const CHART_HEIGHT = 320
const AGE_CHART_HEIGHT = 340
const STAFF_CHART_HEIGHT = 300

function sliceToBars(slice: DemographicSlice, labels: typeof demographicsCopy.bars) {
  return [
    { name: labels.boys, value: slice.boys, color: DEMOGRAPHIC_CHART_COLORS.boys },
    {
      name: labels.boysWithDisability,
      value: slice.boysWithDisability,
      color: DEMOGRAPHIC_CHART_COLORS.boysWithDisability,
    },
    { name: labels.girls, value: slice.girls, color: DEMOGRAPHIC_CHART_COLORS.girls },
    {
      name: labels.girlsWithDisability,
      value: slice.girlsWithDisability,
      color: DEMOGRAPHIC_CHART_COLORS.girlsWithDisability,
    },
    {
      name: labels.withDisability,
      value: slice.withDisability,
      color: DEMOGRAPHIC_CHART_COLORS.withDisability,
    },
    { name: labels.total, value: slice.total, color: DEMOGRAPHIC_CHART_COLORS.total },
  ]
}

function staffGenderBars(
  staff: { male: number; female: number; unknownGender: number; total: number },
  labels: typeof demographicsCopy.bars,
) {
  const rows = [
    { name: labels.male, value: staff.male, color: DEMOGRAPHIC_CHART_COLORS.male },
    { name: labels.female, value: staff.female, color: DEMOGRAPHIC_CHART_COLORS.female },
  ]
  if (staff.unknownGender > 0) {
    rows.push({
      name: labels.unknownGender,
      value: staff.unknownGender,
      color: DEMOGRAPHIC_CHART_COLORS.unknown,
    })
  }
  rows.push({ name: labels.total, value: staff.total, color: DEMOGRAPHIC_CHART_COLORS.total })
  return rows
}

function totalOnlyBar(total: number, label: string) {
  return [{ name: label, value: total, color: DEMOGRAPHIC_CHART_COLORS.total }]
}

function formatAsOf(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}

function Section({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="space-y-4" aria-labelledby={`demo-sec-${title}`}>
      <div className="border-b border-border pb-2">
        <h2 id={`demo-sec-${title}`} className="text-subheading font-semibold text-text">
          {title}
        </h2>
      </div>
      {children}
    </section>
  )
}

export function ChildrenDemographicsDashboard({
  data,
  isError,
  onRetry,
  filtersSlot,
}: {
  data: ChildrenDemographicsViewModel | undefined
  isError?: boolean
  onRetry?: () => void
  filtersSlot?: ReactNode
}) {
  const [childrenTab, setChildrenTab] = useState<ChildrenChartTab>('total')
  const copy = demographicsCopy

  const childrenOverviewBars = useMemo(() => {
    if (!data) return []
    return [
      { name: copy.bars.boys, value: data.children.boys, color: DEMOGRAPHIC_CHART_COLORS.boys },
      { name: copy.bars.girls, value: data.children.girls, color: DEMOGRAPHIC_CHART_COLORS.girls },
      {
        name: copy.bars.totalChildren,
        value: data.children.total,
        color: DEMOGRAPHIC_CHART_COLORS.total,
      },
    ]
  }, [data, copy.bars.boys, copy.bars.girls, copy.bars.totalChildren])

  const byDistrictBars = useMemo(() => {
    if (!data) return []
    return data.byDistrict
      .filter((row) => row.total > 0)
      .map((row) => ({
        name: row.districtName,
        boys: row.boys,
        girls: row.girls,
        total: row.total,
      }))
  }, [data])

  const emptyChart = {
    emptyMessage: copy.chartEmpty,
    emptyDescription: copy.chartEmptyDesc,
    tone: 'white' as const,
    showValueLabels: true,
  }

  if (isError && !data) {
    return (
      <Card padding="lg">
        <p className="text-body text-text-secondary">{copy.loadError}</p>
        {onRetry ? (
          <Button type="button" variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
            {copy.retry}
          </Button>
        ) : null}
      </Card>
    )
  }

  if (!data) {
    return <p className="text-body text-text-muted py-8">{copy.loading}</p>
  }

  const age = data.children.byAgeBand
  const ratioValue =
    data.childrenPerCaregiver == null
      ? copy.noRate
      : data.childrenPerCaregiver.toLocaleString(undefined, {
          maximumFractionDigits: 1,
        })

  return (
    <div className="space-y-8 pb-6">
      {filtersSlot ? (
        <Card padding="lg" elevated={false} className="bg-surface-muted/40">
          <div className="space-y-3">
            {filtersSlot}
            <p className="text-caption text-text-muted">
              {copy.asOfLabel}: {formatAsOf(data.asOf)} · {data.centersInScope.toLocaleString()}{' '}
              {copy.centersInScope}
            </p>
          </div>
        </Card>
      ) : (
        <p className="text-caption text-text-muted">
          {copy.asOfLabel}: {formatAsOf(data.asOf)} · {data.centersInScope.toLocaleString()}{' '}
          {copy.centersInScope}
        </p>
      )}

      <Section title={copy.sectionSummary}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label={copy.kpiTotalChildren} value={data.children.total.toLocaleString()} />
          <StatCard label={copy.kpiChildrenPerCaregiver} value={ratioValue} />
          <StatCard label={copy.kpiBoys} value={data.children.boys.toLocaleString()} />
          <StatCard label={copy.kpiGirls} value={data.children.girls.toLocaleString()} />
        </div>
      </Section>

      <Section title={copy.sectionChildren}>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <ChartFullscreenPanel
            title={copy.chartChildrenTitle}
            hint={copy.chartChildrenHint}
            padding="lg"
            chartHeight={CHART_HEIGHT}
            fullscreenChartHeight={560}
            className="lg:col-span-2"
            footer={
              <SegmentedTabs
                aria-label={copy.childrenTabsAria}
                columns={2}
                value={childrenTab}
                onChange={setChildrenTab}
                options={[
                  { id: 'total', label: copy.tabTotalChildren },
                  { id: 'byDistrict', label: copy.tabByDistrict },
                ]}
              />
            }
            renderChart={(height) =>
              childrenTab === 'total' ? (
                <EnhancedBarChart
                  data={childrenOverviewBars}
                  height={height}
                  ariaLabel={copy.chartChildrenTitle}
                  {...emptyChart}
                />
              ) : (
                <EnhancedBarChart
                  data={byDistrictBars}
                  series={[
                    {
                      dataKey: 'boys',
                      label: copy.bars.boys,
                      color: DEMOGRAPHIC_CHART_COLORS.boys,
                    },
                    {
                      dataKey: 'girls',
                      label: copy.bars.girls,
                      color: DEMOGRAPHIC_CHART_COLORS.girls,
                    },
                  ]}
                  height={Math.max(height, Math.min(byDistrictBars.length, 14) * 32 + 96)}
                  layout={byDistrictBars.length > 6 ? 'vertical' : 'horizontal'}
                  yTickFormatter={formatCountTick}
                  ariaLabel={copy.tabByDistrict}
                  {...emptyChart}
                  showValueLabels={byDistrictBars.length <= 8}
                />
              )
            }
          />

          <ChartFullscreenPanel
            title={copy.chartAge02}
            padding="lg"
            chartHeight={AGE_CHART_HEIGHT}
            fullscreenChartHeight={560}
            renderChart={(height) => (
              <EnhancedBarChart
                data={sliceToBars(age.age_0_2, copy.bars)}
                height={height}
                layout="vertical"
                categoryAxisWidth={150}
                ariaLabel={copy.chartAge02}
                {...emptyChart}
              />
            )}
          />

          <ChartFullscreenPanel
            title={copy.chartAge36}
            padding="lg"
            chartHeight={AGE_CHART_HEIGHT}
            fullscreenChartHeight={560}
            renderChart={(height) => (
              <EnhancedBarChart
                data={sliceToBars(age.age_3_6, copy.bars)}
                height={height}
                layout="vertical"
                categoryAxisWidth={150}
                ariaLabel={copy.chartAge36}
                {...emptyChart}
              />
            )}
          />

          <ChartFullscreenPanel
            title={copy.chartAgeAbove6}
            padding="lg"
            chartHeight={AGE_CHART_HEIGHT}
            fullscreenChartHeight={560}
            className="lg:col-span-2"
            renderChart={(height) => (
              <EnhancedBarChart
                data={sliceToBars(age.age_above_6, copy.bars)}
                height={height}
                layout="vertical"
                categoryAxisWidth={150}
                ariaLabel={copy.chartAgeAbove6}
                {...emptyChart}
              />
            )}
          />
        </div>
      </Section>

      <Section title={copy.sectionStaff}>
        {/* 6-col on xl: top row 3×2, bottom row 2×3 so the last pair fills the full width */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-6">
          <ChartFullscreenPanel
            title={copy.chartCaregivers}
            padding="lg"
            chartHeight={STAFF_CHART_HEIGHT}
            fullscreenChartHeight={520}
            className="xl:col-span-2"
            renderChart={(height) => (
              <EnhancedBarChart
                data={staffGenderBars(data.caregivers, copy.bars)}
                height={height}
                ariaLabel={copy.chartCaregivers}
                {...emptyChart}
              />
            )}
          />
          <ChartFullscreenPanel
            title={copy.chartCertificate}
            hint={copy.chartCertificateHint}
            padding="lg"
            chartHeight={STAFF_CHART_HEIGHT}
            fullscreenChartHeight={520}
            className="xl:col-span-2"
            renderChart={(height) => (
              <EnhancedBarChart
                data={totalOnlyBar(
                  data.caregivers.education.withTrainingCertificate,
                  copy.bars.total,
                )}
                height={height}
                ariaLabel={copy.chartCertificate}
                {...emptyChart}
              />
            )}
          />
          <ChartFullscreenPanel
            title={copy.chartDiploma}
            hint={copy.chartEducationHint}
            padding="lg"
            chartHeight={STAFF_CHART_HEIGHT}
            fullscreenChartHeight={520}
            className="xl:col-span-2"
            renderChart={(height) => (
              <EnhancedBarChart
                data={totalOnlyBar(data.caregivers.education.diploma, copy.bars.total)}
                height={height}
                ariaLabel={copy.chartDiploma}
                {...emptyChart}
              />
            )}
          />
          <ChartFullscreenPanel
            title={copy.chartDegree}
            hint={copy.chartEducationHint}
            padding="lg"
            chartHeight={STAFF_CHART_HEIGHT}
            fullscreenChartHeight={520}
            className="xl:col-span-3"
            renderChart={(height) => (
              <EnhancedBarChart
                data={totalOnlyBar(data.caregivers.education.degree, copy.bars.total)}
                height={height}
                ariaLabel={copy.chartDegree}
                {...emptyChart}
              />
            )}
          />
          <ChartFullscreenPanel
            title={copy.chartSupportingStaff}
            hint={copy.chartSupportingHint}
            padding="lg"
            chartHeight={STAFF_CHART_HEIGHT}
            fullscreenChartHeight={520}
            className="xl:col-span-3"
            renderChart={(height) => (
              <EnhancedBarChart
                data={staffGenderBars(data.supportingStaff, copy.bars)}
                height={height}
                ariaLabel={copy.chartSupportingStaff}
                {...emptyChart}
              />
            )}
          />
        </div>
      </Section>
    </div>
  )
}
