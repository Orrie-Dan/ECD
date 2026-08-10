import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import {
  Building2,
  MapPin,
  Phone,
  Users,
  User,
  X,
  ArrowRight,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { district } from '@/locales/rw/district'
import { common } from '@/locales/rw/common'
import type { MapCenterSummary } from './types'

interface MapCenterPanelProps {
  center: MapCenterSummary | null
  onClose: () => void
  className?: string
}

/**
 * Selected-center information panel.
 * Future: populate from FeatureLayer query / popup selection attributes.
 */
export function MapCenterPanel({ center, onClose, className = '' }: MapCenterPanelProps) {
  if (!center) {
    return (
      <Card
        padding="md"
        className={className}
        data-gis-slot="center-panel"
        role="status"
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-background-subtle shrink-0">
            <Building2 size={18} className="text-text-muted" aria-hidden />
          </span>
          <h3 className="text-body font-semibold text-text">{district.gis.centerPanelTitle}</h3>
        </div>
        <p className="text-body text-text-secondary">{district.gis.centerPanelEmpty}</p>
      </Card>
    )
  }

  return (
    <Card padding="md" className={className} data-gis-slot="center-panel">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <p className="text-caption font-semibold text-text-muted uppercase tracking-wide">
            {district.gis.centerPanelTitle}
          </p>
          <h3 className="text-subheading text-text mt-1 break-words">{center.name}</h3>
        </div>
        <Button
          type="button"
          variant="tertiary"
          size="sm"
          icon={<X size={16} />}
          onClick={onClose}
          aria-label={common.close}
        >
          <span className="sr-only">{common.close}</span>
        </Button>
      </div>

      <dl className="space-y-3">
        <InfoRow
          icon={<MapPin size={16} />}
          label={district.centers.sector}
          value={`${center.sector} · ${center.cell}`}
        />
        <InfoRow
          icon={<Users size={16} />}
          label={district.centers.children}
          value={String(center.children)}
        />
        <InfoRow
          icon={<User size={16} />}
          label={district.centers.caretaker}
          value={center.caretaker}
        />
        <InfoRow
          icon={<Phone size={16} />}
          label={district.centerDetail.phone}
          value={center.caretakerPhone}
        />
        <div className="flex justify-between gap-3 py-2 border-t border-border">
          <dt className="text-body text-text-secondary">{district.centers.attendance}</dt>
          <dd
            className={`text-body font-semibold tabular-nums ${
              center.attendance < 70 ? 'text-warning' : 'text-success'
            }`}
          >
            {center.attendance}%
          </dd>
        </div>
        <div className="flex justify-between gap-3 py-1">
          <dt className="text-body text-text-secondary">{district.reports.submittedToday}</dt>
          <dd className="text-body font-semibold text-text">
            {center.submittedToday ? common.yes : common.no}
          </dd>
        </div>
      </dl>

      <div className="mt-5 pt-4 border-t border-border">
        <Link
          to={`/district/ibigo/${center.id}`}
          className="inline-flex items-center justify-center gap-2 min-h-11 w-full px-4 text-body rounded-xl font-semibold bg-surface text-primary border-2 border-primary shadow-sm hover:bg-primary-light hover:border-primary-dark transition-all"
        >
          {district.gis.viewCenterDetails}
          <ArrowRight size={16} aria-hidden />
        </Link>
      </div>
    </Card>
  )
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-text-muted shrink-0" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <dt className="text-caption text-text-muted">{label}</dt>
        <dd className="text-body text-text break-words">{value}</dd>
      </div>
    </div>
  )
}
