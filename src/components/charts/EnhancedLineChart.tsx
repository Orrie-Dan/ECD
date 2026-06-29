import { memo, useMemo } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { EmptyState } from '@/components/ui/EmptyState'
import { BarChart3 } from 'lucide-react'
import { district } from '@/locales/rw/district'

export interface ChartSeriesConfig {
  dataKey: string
  label: string
  color: string
  /** Optional formatter for tooltip values */
  valueFormatter?: (value: number) => string
}

export interface EnhancedLineChartProps {
  data: Record<string, string | number>[]
  series: ChartSeriesConfig[]
  xDataKey: string
  /** Key used for tooltip header (falls back to xDataKey value) */
  tooltipLabelKey?: string
  height?: number
  showGrid?: boolean
  showLegend?: boolean
  emptyMessage?: string
  emptyDescription?: string
  yDomain?: [number | 'auto', number | 'auto']
  yTickFormatter?: (value: number) => string
  className?: string
  ariaLabel?: string
}

function ChartTooltip({
  active,
  payload,
  label,
  series,
  tooltipLabelKey,
}: {
  active?: boolean
  payload?: Array<{
    dataKey?: string | number
    value?: number | string
    payload?: Record<string, string | number>
  }>
  label?: string | number
  series: ChartSeriesConfig[]
  tooltipLabelKey?: string
}) {
  if (!active || !payload?.length) return null

  const header =
    (tooltipLabelKey && payload[0]?.payload?.[tooltipLabelKey]) ||
    label ||
    payload[0]?.payload?.label

  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2.5 shadow-lg max-w-[14rem]">
      <p className="text-caption font-bold text-text mb-2">{String(header)}</p>
      <ul className="space-y-1">
        {payload.map((entry: { dataKey?: string | number; value?: number | string }) => {
          const config = series.find((s) => s.dataKey === entry.dataKey)
          if (!config || entry.value == null) return null
          const numeric = Number(entry.value)
          const display = config.valueFormatter
            ? config.valueFormatter(numeric)
            : String(entry.value)
          return (
            <li key={entry.dataKey} className="flex items-center gap-2 text-caption text-text-secondary">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: config.color }}
                aria-hidden
              />
              <span>
                {config.label}: <strong className="text-text">{display}</strong>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function EnhancedLineChartComponent({
  data,
  series,
  xDataKey,
  tooltipLabelKey,
  height = 260,
  showGrid = true,
  showLegend = true,
  emptyMessage = district.charts.empty,
  emptyDescription = district.charts.emptyDesc,
  yDomain,
  yTickFormatter,
  className = '',
  ariaLabel,
}: EnhancedLineChartProps) {
  const hasData = data.length > 0 && series.length > 0

  const tickInterval = useMemo(() => {
    if (data.length <= 8) return 0
    if (data.length <= 16) return 1
    return Math.floor(data.length / 6)
  }, [data.length])

  if (!hasData) {
    return (
      <div className={`rounded-xl border border-border bg-background-subtle/30 ${className}`} style={{ minHeight: height }}>
        <EmptyState
          icon={<BarChart3 size={40} className="text-text-muted" strokeWidth={1.5} />}
          title={emptyMessage}
          description={emptyDescription}
        />
      </div>
    )
  }

  return (
    <div
      className={`w-full min-w-0 rounded-xl border border-border bg-background-subtle/30 p-2 sm:p-3 ${className}`}
      role="img"
      aria-label={ariaLabel}
    >
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
          {showGrid && (
            <CartesianGrid
              strokeDasharray="4 6"
              stroke="rgb(148 163 184 / 0.35)"
              vertical={false}
            />
          )}
          <XAxis
            dataKey={xDataKey}
            tick={{ fontSize: 11, fill: 'rgb(100 116 139)' }}
            tickLine={false}
            axisLine={{ stroke: 'rgb(226 230 235)' }}
            interval={tickInterval}
            minTickGap={12}
          />
          <YAxis
            domain={yDomain ?? ['auto', 'auto']}
            tick={{ fontSize: 11, fill: 'rgb(100 116 139)' }}
            tickLine={false}
            axisLine={false}
            width={40}
            tickFormatter={yTickFormatter}
          />
          <Tooltip
            content={
              <ChartTooltip series={series} tooltipLabelKey={tooltipLabelKey} />
            }
            cursor={{ stroke: 'rgb(148 163 184 / 0.5)', strokeWidth: 1 }}
          />
          {showLegend && (
            <Legend
              verticalAlign="bottom"
              height={32}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
              formatter={(value) => (
                <span className="text-caption font-medium text-text-secondary">{value}</span>
              )}
            />
          )}
          {series.map((s) => (
            <Line
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              name={s.label}
              stroke={s.color}
              strokeWidth={2.5}
              dot={{ r: 3, strokeWidth: 2, fill: '#fff' }}
              activeDot={{ r: 5, strokeWidth: 2 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export const EnhancedLineChart = memo(EnhancedLineChartComponent)
