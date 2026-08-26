import type { ReferralViewModel } from '@/models/referral'
import type { Child } from '@/types'
import { district } from '@/locales/rw/district'
import {
  referralFollowUpExportLabel,
  referralSourceExportLabel,
  referralStatusExportLabel,
} from './labels'
import type { ScopedMonitoringExportInput } from './types'

export interface DistrictReferralExportRow {
  childName: string
  centerName: string
  referralDate: string
  sourceLabel: string
  reason: string
  statusLabel: string
  followUpLabel: string
  resolvedDate: string | null
}

export interface DistrictReferralExportDataset {
  input: ScopedMonitoringExportInput
  rows: DistrictReferralExportRow[]
}

export interface ReferralExportLookup {
  childName: (childId: string) => string | undefined
  centerName: (centerId: string) => string | undefined
}

export function mapReferralsToExportRows(
  items: ReferralViewModel[],
  lookup: ReferralExportLookup,
): DistrictReferralExportRow[] {
  return items.map((item) => ({
    childName: lookup.childName(item.childId) ?? '—',
    centerName: lookup.centerName(item.centerId) ?? '—',
    referralDate: item.date,
    sourceLabel: referralSourceExportLabel(item.sourceType),
    reason: item.reason,
    statusLabel: referralStatusExportLabel(item.status),
    followUpLabel: referralFollowUpExportLabel(item.status, item.implementedAt),
    resolvedDate: item.implementedAt?.slice(0, 10) ?? null,
  }))
}

export function mapMockReferralsToExportRows(
  items: ReferralViewModel[],
  children: Child[],
  centerName: (centerId: string) => string | undefined,
): DistrictReferralExportRow[] {
  const childById = new Map(children.map((c) => [c.id, c]))
  return mapReferralsToExportRows(items, {
    childName: (id) => childById.get(id)?.fullName,
    centerName: (id) => centerName(id) ?? childById.get(id)?.centerName,
  })
}

export function districtReferralsExportAvailable(
  rows: DistrictReferralExportRow[],
): boolean {
  return rows.length > 0 && rows.every((row) => row.childName !== '—' && row.centerName !== '—')
}

export function districtReferralsFilenamePrefix(): string {
  return 'ihererekanya'
}

export function districtReferralsTitle(): string {
  return district.referrals.title
}
