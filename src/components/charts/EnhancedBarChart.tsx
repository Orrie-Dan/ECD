import { memo, useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
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
  xAxisLabel?: string
  yAxisLabel?: string
  className?: string
  ariaLabel?: string
  color?: string
  tone?: 'muted' | 'white'
  /** Print numeric labels on each bar (useful for demographic KPI charts). */
  showValueLabels?: boolean
  /** Formatter for printed bar labels. Defaults to a whole-number locale string. */
  valueLabelFormatter?: (value: number) => string
  /** Numeric axis domain (e.g. `[0, 100]` for rates). */
  valueDomain?: [number | 'auto', number | 'auto']
  /** Category axis width when layout is vertical (long labels). */
  categoryAxisWidth?: number
  /** Prefer this payload field as the tooltip header (e.g. full school name). */
  tooltipLabelKey?: string
  /** Fired when a bar is clicked (payload is the row). */
  onBarClick?: (row: Record<string, string | number>) => void
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
  xAxisLabel,
  yAxisLabel,
  className = '',
  ariaLabel,
  color = CHART_METRIC_COLORS.schools,
  tone = 'muted',
  showValueLabels = false,
  valueLabelFormatter,
  valueDomain,
  categoryAxisWidth,
  tooltipLabelKey,
  onBarClick,
}: EnhancedBarChartProps) {
  const wellClass = tone === 'white' ? 'bg-white' : 'bg-background-subtle/30'
  const isVertical = layout === 'vertical'
  const keys = series?.map((s) => s.dataKey) ?? [dataKey]
  const numericDomain = valueDomain ?? ['auto', 'auto']
  const formatBarLabel = (value: number) =>
    valueLabelFormatter
      ? valueLabelFormatter(Number(value))
      : Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })
  const hasData =
    data.length > 0 &&
    keys.length > 0 &&
    data.some((row) => keys.some((key) => Number.isFinite(Number(row[key]))))

  const categoryTicks = useMemo(() => {
    if (data.length <= 8) return 0
    if (data.length <= 16) return 1
    return Math.floor(data.length / 6)
  }, [data.length])

  if (!hasData) {
    return (
      <div
        className={`rounded-xl border border-border ${wellClass} ${className}`}
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

  const axisLabelStyle = {
    fontSize: 11,
    fill: 'rgb(71 85 105)',
    fontWeight: 600,
  } as const

  const categoryAxis = (
    <XAxis
      {...(isVertical
        ? { type: 'number' as const, tickFormatter: yTickFormatter, domain: numericDomain }
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
      label={
        xAxisLabel
          ? {
              value: xAxisLabel,
              position: 'insideBottom',
              offset: -12,
              style: axisLabelStyle,
            }
          : undefined
      }
    />
  )

  const valueAxis = (
    <YAxis
      {...(isVertical
        ? {
            type: 'category' as const,
            dataKey: nameKey,
            width: categoryAxisWidth ?? (yAxisLabel ? 112 : 100),
            tickFormatter: xTickFormatter,
          }
        : {
            type: 'number' as const,
            tickFormatter: yTickFormatter,
            width: yAxisLabel ? 58 : 40,
            domain: numericDomain,
          })}
      tick={{ fontSize: 11, fill: 'rgb(100 116 139)' }}
      tickLine={false}
      axisLine={false}
      label={
        yAxisLabel
          ? {
              value: yAxisLabel,
              angle: -90,
              position: 'insideLeft',
              offset: 8,
              style: { ...axisLabelStyle, textAnchor: 'middle' },
            }
          : undefined
      }
    />
  )

  return (
    <div
      className={`w-full min-w-0 rounded-xl border border-border ${wellClass} p-2 sm:p-3 ${className}`}
      role="img"
      aria-label={ariaLabel}
    >
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout={isVertical ? 'vertical' : 'horizontal'}
          margin={{
            top: showValueLabels ? 22 : 8,
            right: showValueLabels && isVertical ? 36 : 12,
            left: isVertical ? 8 : yAxisLabel ? 8 : 0,
            bottom: xAxisLabel ? 18 : 4,
          }}
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
            content={<ChartTooltip series={series} tooltipLabelKey={tooltipLabelKey} />}
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
                cursor={onBarClick ? 'pointer' : undefined}
                onClick={(state) => {
                  const row = (state as { payload?: Record<string, string | number> })?.payload
                  if (row && onBarClick) onBarClick(row)
                }}
              >
                {data.some((row) => typeof row.color === 'string')
                  ? data.map((row, index) => (
                      <Cell
                        key={`${row[nameKey]}-${index}`}
                        fill={
                          typeof row.color === 'string'
                            ? row.color
                            : s.color
                        }
                      />
                    ))
                  : null}
                {showValueLabels ? (
                  <LabelList
                    dataKey={s.dataKey}
                    position={isVertical ? 'right' : 'top'}
                    className="fill-text-secondary text-[10px] font-semibold"
                    formatter={formatBarLabel}
                  />
                ) : null}
              </Bar>
            ))
          ) : (
            <Bar
              dataKey={dataKey}
              name={ariaLabel}
              fill={color}
              radius={isVertical ? [0, 4, 4, 0] : [4, 4, 0, 0]}
              maxBarSize={28}
              cursor={onBarClick ? 'pointer' : undefined}
              onClick={(state) => {
                const row = (state as { payload?: Record<string, string | number> })?.payload
                if (row && onBarClick) onBarClick(row)
              }}
            >
              {data.map((row, index) => (
                <Cell
                  key={`${row[nameKey]}-${index}`}
                  fill={typeof row.color === 'string' ? row.color : CHART_PALETTE[index % CHART_PALETTE.length]}
                />
              ))}
              {showValueLabels ? (
                <LabelList
                  dataKey={dataKey}
                  position={isVertical ? 'right' : 'top'}
                  className="fill-text-secondary text-[10px] font-semibold"
                  formatter={formatBarLabel}
                />
              ) : null}
            </Bar>
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export const EnhancedBarChart = memo(EnhancedBarChartComponent)
