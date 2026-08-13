export interface ChartTooltipSeries {
  dataKey: string
  label: string
  color: string
  valueFormatter?: (value: number) => string
}

export function ChartTooltip({
  active,
  payload,
  label,
  series,
  tooltipLabelKey,
}: {
  active?: boolean
  payload?: Array<{
    dataKey?: string | number
    name?: string
    value?: number | string
    color?: string
    payload?: Record<string, string | number>
  }>
  label?: string | number
  series?: ChartTooltipSeries[]
  tooltipLabelKey?: string
}) {
  if (!active || !payload?.length) return null

  const header =
    (tooltipLabelKey && payload[0]?.payload?.[tooltipLabelKey]) ||
    label ||
    payload[0]?.payload?.label ||
    payload[0]?.payload?.name

  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2.5 shadow-lg max-w-[14rem]">
      {header != null && header !== '' ? (
        <p className="text-caption font-bold text-text mb-2">{String(header)}</p>
      ) : null}
      <ul className="space-y-1">
        {payload.map((entry) => {
          const config = series?.find((s) => s.dataKey === entry.dataKey)
          if (entry.value == null) return null
          const numeric = Number(entry.value)
          const display = config?.valueFormatter
            ? config.valueFormatter(numeric)
            : String(entry.value)
          const swatch = config?.color ?? entry.color ?? '#1a6b52'
          const itemLabel = config?.label ?? entry.name ?? String(entry.dataKey ?? '')
          return (
            <li
              key={String(entry.dataKey ?? entry.name)}
              className="flex items-center gap-2 text-caption text-text-secondary"
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: swatch }}
                aria-hidden
              />
              <span>
                {itemLabel}: <strong className="text-text">{display}</strong>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
