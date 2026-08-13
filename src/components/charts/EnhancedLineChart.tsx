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
import { ChartTooltip } from './ChartTooltip'

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
