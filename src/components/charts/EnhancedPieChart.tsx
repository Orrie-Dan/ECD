import { memo, useMemo } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { EmptyState } from '@/components/ui/EmptyState'
import { PieChart as PieChartIcon } from 'lucide-react'
import { district } from '@/locales/rw/district'
import { CHART_PALETTE } from '@/lib/chart-theme'
import { ChartTooltip } from './ChartTooltip'

export interface PieSlice {
  name: string
  value: number
  color?: string
}

export interface EnhancedPieChartProps {
  data: PieSlice[]
  height?: number
  innerRadius?: number
  outerRadius?: number
  emptyMessage?: string
  emptyDescription?: string
  className?: string
  ariaLabel?: string
  centerLabel?: string
  centerValue?: string
  /** Chart well background. `white` is used on Impugukirwa. */
  tone?: 'muted' | 'white'
}

function EnhancedPieChartComponent({
  data,
  height = 260,
  innerRadius = 58,
  outerRadius = 88,
  emptyMessage = district.charts.empty,
  emptyDescription = district.charts.emptyDesc,
  className = '',
  ariaLabel,
  centerLabel,
  centerValue,
  tone = 'muted',
}: EnhancedPieChartProps) {
  const wellClass = tone === 'white' ? 'bg-white' : 'bg-background-subtle/30'
  const slices = useMemo(
    () =>
      data
        .filter((slice) => Number(slice.value) > 0)
        .map((slice, index) => ({
          ...slice,
          color: slice.color ?? CHART_PALETTE[index % CHART_PALETTE.length],
        })),
    [data],
  )
  const total = useMemo(
    () => slices.reduce((sum, slice) => sum + Number(slice.value), 0),
    [slices],
  )
  const scaledOuter = Math.min(outerRadius, Math.max(52, Math.round(height * 0.34)))
  const scaledInner = Math.min(innerRadius, Math.round(scaledOuter * 0.66))

  if (slices.length === 0 || total <= 0) {
    return (
      <div
        className={`rounded-xl border border-border ${wellClass} ${className}`}
        style={{ minHeight: height }}
      >
        <EmptyState
          icon={<PieChartIcon size={40} className="text-text-muted" strokeWidth={1.5} />}
          title={emptyMessage}
          description={emptyDescription}
        />
      </div>
    )
  }

  return (
    <div
      className={`w-full min-w-0 rounded-xl border border-border ${wellClass} p-2 sm:p-3 ${className}`}
      role="img"
      aria-label={ariaLabel}
    >
      <div className="relative" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={scaledInner}
              outerRadius={scaledOuter}
              paddingAngle={2}
              stroke="none"
            >
              {slices.map((slice) => (
                <Cell key={slice.name} fill={slice.color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {centerValue || centerLabel ? (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            {centerValue ? (
              <p className="text-heading font-bold text-text tabular-nums leading-none">{centerValue}</p>
            ) : null}
            {centerLabel ? (
              <p className="mt-1 max-w-28 text-caption text-text-secondary leading-tight">
                {centerLabel}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
      <ul className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1 px-1 pb-1">
        {slices.map((slice) => (
          <li key={slice.name} className="flex items-center gap-1.5 text-caption text-text-secondary">
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: slice.color }}
              aria-hidden
            />
            <span>
              {slice.name}{' '}
              <strong className="text-text tabular-nums">{slice.value}</strong>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export const EnhancedPieChart = memo(EnhancedPieChartComponent)
