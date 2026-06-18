import { Map } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { SelectInput } from '@/components/ui/FormField'
import { district } from '@/locales/rw/district'

interface GisEmbedProps {
  title: string
  description?: string
  height?: string
  showFilters?: boolean
}

export function GisEmbed({ title, description, height = '400px', showFilters = false }: GisEmbedProps) {
  return (
    <Card padding="lg">
      <div className="mb-5">
        <h3 className="text-subheading text-text flex items-center gap-2.5">
          <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-secondary-light">
            <Map size={20} className="text-secondary" />
          </span>
          {title}
        </h3>
        {description && (
          <p className="text-body text-text-secondary mt-2 ml-[46px]">{description}</p>
        )}
      </div>

      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <SelectInput>
            <option value="">{district.gis.filterDistrict}</option>
            <option value="gasabo">Gasabo</option>
            <option value="kicukiro">Kicukiro</option>
            <option value="nyarugenge">Nyarugenge</option>
          </SelectInput>
          <SelectInput>
            <option value="">{district.gis.filterSector}</option>
            <option value="remera">Remera</option>
            <option value="gatsata">Gatsata</option>
            <option value="kanombe">Kanombe</option>
          </SelectInput>
          <SelectInput>
            <option value="">{district.gis.filterPeriod}</option>
            <option value="week">{district.gis.periodWeek}</option>
            <option value="month">{district.gis.periodMonth}</option>
            <option value="year">{district.gis.periodYear}</option>
          </SelectInput>
        </div>
      )}

      <div
        className="rounded-xl border border-dashed border-border-strong bg-background-subtle flex flex-col items-center justify-center"
        style={{ minHeight: height }}
        role="img"
        aria-label={title}
      >
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-surface border border-border mb-4 shadow-sm">
          <Map size={32} className="text-text-muted opacity-60" />
        </div>
        <p className="text-body font-semibold text-text-secondary">{district.gis.embedPlaceholder}</p>
        <p className="text-caption mt-2 max-w-sm text-center px-6">
          {district.gis.embedNote}
        </p>
      </div>
    </Card>
  )
}
