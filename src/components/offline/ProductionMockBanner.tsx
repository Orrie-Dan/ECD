import { Alert } from '@/components/ui/Alert'
import { isProductionMockWritesBlocked, productionMockWriteBlockedMessage } from '@/lib/live-api-guard'

/** Warn when a production build is running in MOCK mode (no API POSTs). */
export function ProductionMockBanner({ className = '' }: { className?: string }) {
  if (!isProductionMockWritesBlocked()) return null

  return (
    <Alert variant="warning" className={className} role="status">
      {productionMockWriteBlockedMessage}
    </Alert>
  )
}
