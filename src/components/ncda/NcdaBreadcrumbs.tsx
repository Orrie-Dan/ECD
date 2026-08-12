import { Link } from 'react-router-dom'
import { ncda } from '@/locales/rw/ncda'
import { NCDA_PATHS } from '@/layouts/ncda/navigation'

interface NcdaBreadcrumbsProps {
  currentLabel: string
}

/**
 * Light breadcrumb trail for NCDA section pages.
 * Root always links to the NCDA dashboard landing.
 */
export function NcdaBreadcrumbs({ currentLabel }: NcdaBreadcrumbsProps) {
  return (
    <nav className="mb-3" aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-caption text-text-muted">
        <li>
          <Link
            to={NCDA_PATHS.dashboard}
            className="font-semibold text-text-secondary hover:text-primary focus-visible:outline-3 focus-visible:outline-primary focus-visible:outline-offset-2 rounded-sm"
          >
            {ncda.breadcrumbsRoot}
          </Link>
        </li>
        <li aria-hidden="true" className="text-border-strong">
          /
        </li>
        <li>
          <span className="font-semibold text-text" aria-current="page">
            {currentLabel}
          </span>
        </li>
      </ol>
    </nav>
  )
}
