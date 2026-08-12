import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

type TempPasswordBannerProps = {
  password: string
  title: string
  body: string
  dismissLabel: string
  onDismiss: () => void
}

/**
 * One-time temporary password display — never stored in query cache.
 */
export function TempPasswordBanner({
  password,
  title,
  body,
  dismissLabel,
  onDismiss,
}: TempPasswordBannerProps) {
  return (
    <Card padding="md" className="border-amber-500/40 bg-amber-50/40">
      <h2 className="text-subheading font-semibold text-text mb-2">{title}</h2>
      <p className="text-body text-text-secondary mb-2">{body}</p>
      <p className="font-mono text-heading tracking-wide select-all">{password}</p>
      <Button type="button" variant="secondary" className="mt-3" onClick={onDismiss}>
        {dismissLabel}
      </Button>
    </Card>
  )
}
