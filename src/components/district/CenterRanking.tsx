import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { SearchInput } from '@/components/ui/SearchInput'
import { ECD_CENTERS } from '@/lib/mock-data'
import { district } from '@/locales/rw/district'

interface CenterRankingProps {
  variant: 'top' | 'bottom'
  limit?: number
  showSearch?: boolean
}

function CenterList({ centers, accent }: { centers: typeof ECD_CENTERS; accent: 'success' | 'warning' }) {
  const accentClass = accent === 'success' ? 'text-success' : 'text-warning'

  return (
    <ul className="space-y-2">
      {centers.map((center) => (
        <li key={center.id}>
          <Link
            to={`/district/ibigo/${center.id}`}
            className="flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-primary-light/20 transition-colors group"
          >
            <div className="min-w-0">
              <p className="text-body font-semibold text-text truncate">{center.name}</p>
              <p className="text-caption text-text-secondary mt-0.5">{center.sector}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              <span className={`text-heading font-bold ${accentClass}`}>{center.attendance}%</span>
              <ChevronRight size={18} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function CenterRanking({ variant, limit = 3, showSearch = false }: CenterRankingProps) {
  const [search, setSearch] = useState('')

  const ranked = useMemo(() => {
    const sorted = [...ECD_CENTERS].sort((a, b) =>
      variant === 'top' ? b.attendance - a.attendance : a.attendance - b.attendance,
    )
    if (!search.trim()) return sorted.slice(0, limit)
    const q = search.toLowerCase()
    return sorted.filter(
      (c) => c.name.toLowerCase().includes(q) || c.sector.toLowerCase().includes(q),
    )
  }, [variant, limit, search])

  const title = variant === 'top' ? district.dashboard.topCenters : district.dashboard.bottomCenters
  const accent = variant === 'top' ? 'success' : 'warning'

  return (
    <Card padding="lg" className="h-full">
      <h3 className="text-subheading text-text mb-4">{title}</h3>
      {showSearch && (
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={district.dashboard.searchCenter}
          className="mb-4"
        />
      )}
      {ranked.length === 0 ? (
        <p className="text-body text-text-secondary py-6 text-center">{district.centers.noResults}</p>
      ) : (
        <CenterList centers={ranked} accent={accent} />
      )}
    </Card>
  )
}
