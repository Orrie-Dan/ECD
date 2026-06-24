import { useParams, useSearchParams } from 'react-router-dom'
import { CaretakerLayout } from '@/layouts/CaretakerLayout'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Pagination } from '@/components/ui/Pagination'
import { useData } from '@/contexts/AppContext'
import { usePagination } from '@/hooks/usePagination'
import { caretaker } from '@/locales/rw/caretaker'
import { common, gender, relations, location, getGuardianRelationLabel, normalizeGuardianRelation } from '@/locales/rw/common'
import { calculateAge, formatDate } from '@/lib/mock-data'
import { formatArrivalTime, getBroughtByLabel } from '@/lib/attendance-utils'

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2.5 border-b border-border last:border-0">
      <dt className="text-body text-text-secondary">{label}</dt>
      <dd className="text-body font-semibold text-text text-right">{value}</dd>
    </div>
  )
}

export function ChildDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const tab = searchParams.get('tab') ?? 'info'
  const { children, getChildAttendance } = useData()

  const child = children.find((c) => c.id === id)
  const attendance = child ? getChildAttendance(child.id) : []
  const attendancePagination = usePagination(attendance, { resetDeps: [id] })

  if (!child) {
    return (
      <CaretakerLayout pageTitle={caretaker.childDetail.title} backTo="/caretaker/abana" backLabel={common.back}>
        <EmptyState title="Umwana ntaboneka" description="Uyu mwana ntiboneka mu rutonde" />
      </CaretakerLayout>
    )
  }

  const presentCount = attendance.filter((a) => a.present).length
  const absentCount = attendance.filter((a) => !a.present).length
  const initials = getInitials(child.fullName)

  return (
    <CaretakerLayout pageTitle={child.fullName} backTo="/caretaker/abana" backLabel={common.back}>
      <div className="flex items-center gap-4 mb-8 p-5 bg-surface rounded-xl border border-border shadow-card max-w-3xl">
        <div
          className={`flex items-center justify-center w-16 h-16 rounded-xl text-xl font-bold shrink-0 ${
            child.gender === 'Umuhungu' ? 'bg-secondary-light text-secondary' : 'bg-primary-light text-primary'
          }`}
        >
          {initials}
        </div>
        <div>
          <h2 className="text-heading text-text">{child.fullName}</h2>
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
              <p className="text-body text-text-secondary text-center py-8">Nta mateka y'ubwitabire</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-caption font-semibold text-text-muted pb-3 pr-4">Itariki</th>
                      <th className="text-caption font-semibold text-text-muted pb-3 pr-4">{caretaker.childDetail.checkInTime}</th>
                      <th className="text-caption font-semibold text-text-muted pb-3 pr-4">Imiterere</th>
                      <th className="text-caption font-semibold text-text-muted pb-3">Yazanywe na</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendancePagination.items.map((record) => (
                      <tr key={record.id} className="border-b border-border last:border-0">
                        <td className="py-3 pr-4 text-body">{formatDate(record.date)}</td>
                        <td className="py-3 pr-4 text-body font-mono">
                          {record.present ? formatArrivalTime(record.arrivedAt) : '—'}
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`text-caption font-semibold px-3 py-1 rounded-full ${
                            record.present ? 'bg-success-light text-success' : 'bg-background-subtle text-text-muted'
                          }`}>
                            {record.present ? caretaker.childDetail.present : caretaker.childDetail.absent}
                          </span>
                        </td>
                        <td className="py-3 text-body text-text-secondary">
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
            <h3 className="text-label text-primary mb-4">Amakuru y'Umwana</h3>
            <dl>
              <DetailRow label="Amazina" value={child.fullName} />
              <DetailRow label="Itariki y'amavuko" value={formatDate(child.dateOfBirth)} />
              <DetailRow label="Igitsina cy'umwana" value={gender[child.gender]} />
              <DetailRow
                label={caretaker.registration.specialNeeds}
                value={child.specialNeeds || caretaker.registration.notProvided}
              />
              <DetailRow label={caretaker.childDetail.dateRegistered} value={formatDate(child.registeredAt)} />
            </dl>
          </Card>
          <Card padding="lg">
            <h3 className="text-label text-primary mb-4">{caretaker.registration.guardian1Section}</h3>
            <dl>
              <DetailRow label="Amazina" value={child.guardianName} />
              <DetailRow label="Telefone" value={child.guardianPhone} />
              <DetailRow label="Isano" value={getGuardianRelationLabel(normalizeGuardianRelation(child.guardianRelation) ?? child.guardianRelation)} />
            </dl>
          </Card>
          {child.guardian2Name && (
            <Card padding="lg">
              <h3 className="text-label text-primary mb-4">{caretaker.registration.guardian2Section}</h3>
              <dl>
                <DetailRow label="Amazina" value={child.guardian2Name} />
                <DetailRow label="Telefone" value={child.guardian2Phone ?? ''} />
                <DetailRow
                  label="Isano"
                  value={
                    child.guardian2Relation
                      ? getGuardianRelationLabel(normalizeGuardianRelation(child.guardian2Relation) ?? child.guardian2Relation)
                      : ''
                  }
                />
              </dl>
            </Card>
          )}
          <Card padding="lg">
            <h3 className="text-label text-primary mb-4">Aho Atuye</h3>
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
    </CaretakerLayout>
  )
}
