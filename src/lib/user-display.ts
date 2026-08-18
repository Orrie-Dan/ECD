import type { User } from '@/types'
import { common } from '@/locales/rw/common'
import { isUuidLike } from '@/lib/child-routes'

export function formatRecordedByLabel(recordedBy: string | undefined, user: User | null): string {
  const value = recordedBy?.trim()
  if (!value) return '—'
  if (user?.id && value === user.id) return user.name
  if (isUuidLike(value)) return common.ui.systemUser
  return value
}
