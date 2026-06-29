import { useParams, useSearchParams } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Pagination } from '@/components/ui/Pagination'
import { useData } from '@/contexts/AppContext'
import { usePagination } from '@/hooks/usePagination'
import { caretaker } from '@/locales/rw/caretaker'
import { gender, relations, location, common, getGuardianRelationLabel, normalizeGuardianRelation } from '@/locales/rw/common'
import { calculateAge, formatDate } from '@/lib/mock-data'
import { formatArrivalTime, getBroughtByLabel } from '@/lib/attendance-utils'
import type { Child } from '@/types'

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-4 py-2.5 border-b border-border last:border-0">
      <dt className="text-body text-text-secondary shrink-0">{label}</dt>
      <dd className="text-body font-semibold text-text sm:text-right break-words">{value}</dd>
    </div>
  )
}

function SpecialNeedsBlock({ needs }: { needs?: string }) {
  const trimmed = needs?.trim()
  const hasNeeds = Boolean(trimmed)

  return (
    <div className="py-3 border-t border-border mt-1">
      <dt className="text-body font-semibold text-text">{caretaker.childDetail.specialNeedsLabel}</dt>
      <p className="text-caption text-text-muted mt-0.5 mb-2.5 leading-snug">
        {caretaker.childDetail.specialNeedsHint}
      </p>
      <dd>
        {hasNeeds ? (
          <SpecialNeedsContent text={trimmed!} />
        ) : (
          <p className="text-body text-text-muted italic">{caretaker.registration.notProvided}</p>
        )}
      </dd>
    </div>
  )
}

function SpecialNeedsContent({ text }: { text: string }) {
  const segments = text.split(/\s*—\s*/).map((part) => part.trim()).filter(Boolean)

  if (segments.length <= 1) {
    return (
      <div className="rounded-lg border border-border bg-background-subtle/50 px-3.5 py-3">
        <p className="text-body text-text leading-relaxed whitespace-pre-wrap break-words">{text}</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-warning/25 bg-warning-light/35 px-3.5 py-3 space-y-2.5">
      {segments.map((segment, index) => (
        <div
          key={index}
          className={index > 0 ? 'pt-2.5 border-t border-warning/15' : undefined}
        >
          {index === 0 ? (
            <p className="text-body font-semibold text-text leading-snug break-words">{segment}</p>
          ) : (
            <p className="text-body text-text-secondary leading-relaxed break-words">{segment}</p>
          )}
        </div>
      ))}
    </div>
  )
}

interface ChildDetailContentProps {
  child: Child
}

export function ChildDetailContent({ child }: ChildDetailContentProps) {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const tab = searchParams.get('tab') ?? 'info'
  const { getChildAttendance } = useData()

  const attendance = getChildAttendance(child.id)
  const attendancePagination = usePagination(attendance, { resetDeps: [id] })
  const presentCount = attendance.filter((a) => a.present).length
  const absentCount = attendance.filter((a) => !a.present).length
  const initials = getInitials(child.fullName)

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start gap-4 mb-6 sm:mb-8 p-4 sm:p-5 bg-surface rounded-xl border border-border shadow-card max-w-3xl">
        <div
          className={`flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-xl text-lg sm:text-xl font-bold shrink-0 ${
            child.gender === 'Umuhungu' ? 'bg-secondary-light text-secondary' : 'bg-primary-light text-primary'
          }`}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <h2 className="text-heading text-text break-words">{child.fullName}</h2>
          <p className="text-body text-text-secondary mt-0.5">
            {caretaker.children.age}: {calculateAge(child.dateOfBirth)} · {gender[child.gender]}
          </p>
        </div>
      </div>

      {tab === 'attendance' ? (
        <div className="space-y-6 max-w-4xl">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card padding="md" className="border-success/20 bg-success-light/40">
              <p className="text-display text-success leading-none">{presentCount}</p>
              <p className="text-caption text-success mt-2">{caretaker.childDetail.totalPresent}</p>
            </Card>
            <Card padding="md">
              <p className="text-display text-text leading-none">{absentCount}</p>
              <p className="text-caption mt-2">{caretaker.childDetail.totalAbsent}</p>
            </Card>
          </div>

          <Card padding="lg">
            <h3 className="text-subheading text-text mb-5">{caretaker.childDetail.attendanceHistory}</h3>
            {attendance.length === 0 ? (
              <p className="text-body text-text-secondary text-center py-8">{caretaker.childDetail.noAttendanceHistory}</p>
            ) : (
              <div className="overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0">
                <table className="w-full min-w-0 text-left responsive-table-cards">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-caption font-semibold text-text-muted pb-3 pr-4">{common.labels.date}</th>
                      <th className="text-caption font-semibold text-text-muted pb-3 pr-4">
                        {caretaker.childDetail.checkInTime}
                      </th>
                      <th className="text-caption font-semibold text-text-muted pb-3 pr-4">{common.labels.status}</th>
                      <th className="text-caption font-semibold text-text-muted pb-3">{common.labels.broughtBy}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendancePagination.items.map((record) => (
                      <tr key={record.id} className="border-b border-border last:border-0">
                        <td className="py-3 pr-4 text-body" data-label={common.labels.date}>
                          {formatDate(record.date)}
                        </td>
                        <td className="py-3 pr-4 text-body font-mono" data-label={caretaker.childDetail.checkInTime}>
                          {record.present ? formatArrivalTime(record.arrivedAt) : '—'}
                        </td>
                        <td className="py-3 pr-4" data-label={common.labels.status}>
                          <span
                            className={`text-caption font-semibold px-3 py-1 rounded-full whitespace-nowrap ${
                              record.present
                                ? 'bg-success-light text-success'
                                : 'bg-background-subtle text-text-muted'
                            }`}
                          >
                            {record.present ? caretaker.childDetail.present : caretaker.childDetail.absent}
                          </span>
                        </td>
                        <td className="py-3 text-body text-text-secondary break-words" data-label={common.labels.broughtBy}>
                          {record.present
                            ? getBroughtByLabel(record.broughtBy, record.broughtByOther, relations)
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Pagination
              page={attendancePagination.page}
              pageSize={attendancePagination.pageSize}
              total={attendancePagination.total}
              totalPages={attendancePagination.totalPages}
              startIndex={attendancePagination.startIndex}
              endIndex={attendancePagination.endIndex}
              hasPrevious={attendancePagination.hasPrevious}
              hasNext={attendancePagination.hasNext}
              onPageChange={attendancePagination.setPage}
              onPageSizeChange={attendancePagination.setPageSize}
              className="mt-0!"
            />
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card padding="lg">
            <h3 className="text-label text-primary mb-4">{caretaker.registration.reviewChild}</h3>
            <dl>
              <DetailRow label={common.labels.name} value={child.fullName} />
              <DetailRow label={common.labels.dateOfBirth} value={formatDate(child.dateOfBirth)} />
              <DetailRow label={common.labels.childGender} value={gender[child.gender]} />
              <DetailRow label={caretaker.childDetail.dateRegistered} value={formatDate(child.registeredAt)} />
              <SpecialNeedsBlock needs={child.specialNeeds} />
            </dl>
          </Card>
          <Card padding="lg">
            <h3 className="text-label text-primary mb-4">{caretaker.registration.guardian1Section}</h3>
            <dl>
              <DetailRow label={common.labels.name} value={child.guardianName} />
              <DetailRow label={common.labels.phone} value={child.guardianPhone} />
              <DetailRow
                label={common.labels.relation}
                value={getGuardianRelationLabel(
                  normalizeGuardianRelation(child.guardianRelation) ?? child.guardianRelation,
                )}
              />
            </dl>
          </Card>
          {child.guardian2Name && (
            <Card padding="lg">
              <h3 className="text-label text-primary mb-4">{caretaker.registration.guardian2Section}</h3>
              <dl>
                <DetailRow label={common.labels.name} value={child.guardian2Name} />
                <DetailRow label={common.labels.phone} value={child.guardian2Phone ?? ''} />
                <DetailRow
                  label={common.labels.relation}
                  value={
                    child.guardian2Relation
                      ? getGuardianRelationLabel(
                          normalizeGuardianRelation(child.guardian2Relation) ?? child.guardian2Relation,
                        )
                      : ''
                  }
                />
              </dl>
            </Card>
          )}
          <Card padding="lg">
            <h3 className="text-label text-primary mb-4">{caretaker.registration.reviewLocation}</h3>
            <dl>
              <DetailRow label={location.province} value={child.province} />
              <DetailRow label={location.district} value={child.district} />
              <DetailRow label={location.sector} value={child.sector} />
              <DetailRow label={location.cell} value={child.cell} />
              <DetailRow label={location.village} value={child.village} />
            </dl>
          </Card>
        </div>
      )}
    </>
  )
}
