import { memo, useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { EmptyState } from '@/components/ui/EmptyState'
import { BarChart3 } from 'lucide-react'
import { district } from '@/locales/rw/district'
import { CHART_METRIC_COLORS, CHART_PALETTE } from '@/lib/chart-theme'
import { ChartTooltip } from './ChartTooltip'
import type { ChartSeriesConfig } from './EnhancedLineChart'

export interface EnhancedBarChartProps {
  data: Record<string, string | number>[]
  /** Single-series bars. Ignored when `series` is set. */
  dataKey?: string
  nameKey?: string
  series?: ChartSeriesConfig[]
  height?: number
  layout?: 'horizontal' | 'vertical'
  showGrid?: boolean
  emptyMessage?: string
  emptyDescription?: string
  yTickFormatter?: (value: number) => string
  xTickFormatter?: (value: string | number) => string
  className?: string
  ariaLabel?: string
  color?: string
}

function EnhancedBarChartComponent({
  data,
  dataKey = 'value',
  nameKey = 'name',
  series,
  height = 260,
  layout = 'horizontal',
  showGrid = true,
  emptyMessage = district.charts.empty,
  emptyDescription = district.charts.emptyDesc,
  yTickFormatter,
  xTickFormatter,
  className = '',
  ariaLabel,
  color = CHART_METRIC_COLORS.schools,
}: EnhancedBarChartProps) {
  const isVertical = layout === 'vertical'
  const keys = series?.map((s) => s.dataKey) ?? [dataKey]
  const hasData =
    data.length > 0 &&
    keys.length > 0 &&
    data.some((row) => keys.some((key) => Number(row[key] ?? 0) > 0))

  const categoryTicks = useMemo(() => {
    if (data.length <= 8) return 0
    if (data.length <= 16) return 1
    return Math.floor(data.length / 6)
  }, [data.length])

  if (!hasData) {
    return (
      <div
        className={`rounded-xl border border-border bg-background-subtle/30 ${className}`}
        style={{ minHeight: height }}
      >
        <EmptyState
          icon={<BarChart3 size={40} className="text-text-muted" strokeWidth={1.5} />}
          title={emptyMessage}
          description={emptyDescription}
        />
      </div>
    )
  }

  const categoryAxis = (
    <XAxis
      {...(isVertical
        ? { type: 'number' as const, tickFormatter: yTickFormatter }
        : {
            type: 'category' as const,
            dataKey: nameKey,
            interval: categoryTicks,
            tickFormatter: xTickFormatter,
          })}
      tick={{ fontSize: 11, fill: 'rgb(100 116 139)' }}
      tickLine={false}
      axisLine={{ stroke: 'rgb(226 230 235)' }}
      minTickGap={8}
    />
  )

  const valueAxis = (
    <YAxis
      {...(isVertical
        ? {
            type: 'category' as const,
            dataKey: nameKey,
            width: 88,
            tickFormatter: xTickFormatter,
          }
        : { type: 'number' as const, tickFormatter: yTickFormatter, width: 40 })}
      tick={{ fontSize: 11, fill: 'rgb(100 116 139)' }}
      tickLine={false}
      axisLine={false}
    />
  )

  return (
    <div
      className={`w-full min-w-0 rounded-xl border border-border bg-background-subtle/30 p-2 sm:p-3 ${className}`}
      role="img"
      aria-label={ariaLabel}
    >
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout={isVertical ? 'vertical' : 'horizontal'}
          margin={{ top: 8, right: 12, left: isVertical ? 4 : 0, bottom: 4 }}
        >
          {showGrid && (
            <CartesianGrid
              strokeDasharray="4 6"
              stroke="rgb(148 163 184 / 0.35)"
              horizontal={!isVertical}
              vertical={isVertical}
            />
          )}
          {isVertical ? valueAxis : categoryAxis}
          {isVertical ? categoryAxis : valueAxis}
          <Tooltip
            content={<ChartTooltip series={series} />}
            cursor={{ fill: 'rgb(148 163 184 / 0.12)' }}
          />
          {series ? (
            series.map((s) => (
              <Bar
                key={s.dataKey}
                dataKey={s.dataKey}
                name={s.label}
                fill={s.color}
                radius={isVertical ? [0, 4, 4, 0] : [4, 4, 0, 0]}
                maxBarSize={36}
              />
            ))
          ) : (
            <Bar
              dataKey={dataKey}
              name={ariaLabel}
              fill={color}
              radius={isVertical ? [0, 4, 4, 0] : [4, 4, 0, 0]}
              maxBarSize={28}
            >
              {data.map((row, index) => (
                <Cell
                  key={`${row[nameKey]}-${index}`}
                  fill={typeof row.color === 'string' ? row.color : CHART_PALETTE[index % CHART_PALETTE.length]}
                />
              ))}
            </Bar>
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export const EnhancedBarChart = memo(EnhancedBarChartComponent)
