import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { PageContainer, PageContent } from '@/components/ui/PageShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Pagination } from '@/components/ui/Pagination'
import { Skeleton } from '@/components/ui/Skeleton'
import { LiveUnavailableState } from '@/components/ui/LiveUnavailableState'
import { NcdaDashboardSection } from '@/components/ncda/NcdaDashboardSection'
import { env } from '@/config/env'
import {
  useNcdaChildAttendance,
  useNcdaChildDetail,
  useNcdaChildNutrition,
  useNcdaChildSted,
} from '@/features/ncda/children/queries'
import { NCDA_PATHS } from '@/layouts/ncda/navigation'
import { ncda } from '@/locales/rw/ncda'

const OPS_PAGE_SIZE = 10

type OpsSection =
  | 'profile'
  | 'attendance'
  | 'nutrition'
  | 'sted'
  | 'feeding'

function formatDate(iso: string | undefined | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString()
  } catch {
    return String(iso).slice(0, 10)
  }
}

/**
 * NCDA child detail — identity + child-scoped operational histories.
 * No district-wide or national operational downloads.
 */
export function NcdaChildDetailPage() {
  if (!env.isLive) {
    return (
      <PageContainer>
        <PageHeader
          title={ncda.sections.children.title}
          subtitle={ncda.children.detailSubtitle}
          size="compact"
        />
        <PageContent>
          <LiveUnavailableState
            title={ncda.children.mockOnlyTitle}
            description={ncda.children.mockOnlyBody}
          />
        </PageContent>
      </PageContainer>
    )
  }

  return <NcdaChildDetailLive />
}

function NcdaChildDetailLive() {
  const { childId = '' } = useParams<{ childId: string }>()
  const [section, setSection] = useState<OpsSection>('profile')
  const [opsPage, setOpsPage] = useState(1)

  const detail = useNcdaChildDetail(childId)
  const attendanceQ = useNcdaChildAttendance(
    childId,
    opsPage,
    OPS_PAGE_SIZE,
    section === 'attendance' && Boolean(childId),
  )
  const nutritionQ = useNcdaChildNutrition(
    childId,
    opsPage,
    OPS_PAGE_SIZE,
    section === 'nutrition' && Boolean(childId),
  )
  const stedQ = useNcdaChildSted(
    childId,
    opsPage,
    OPS_PAGE_SIZE,
    section === 'sted' && Boolean(childId),
  )

  const backLink = (
    <Link
      to={NCDA_PATHS.children}
      className="inline-flex items-center gap-1.5 text-caption font-semibold text-primary hover:underline focus-visible:outline-3 focus-visible:outline-primary focus-visible:outline-offset-2 rounded-sm"
    >
      <ArrowLeft size={14} aria-hidden />
      {ncda.children.backToList}
    </Link>
  )

  if (detail.isError && !detail.data) {
    const is404 =
      (detail.error as { response?: { status?: number } } | null)?.response?.status === 404
    return (
      <PageContainer>
        <PageHeader
          title={ncda.sections.children.title}
          subtitle={ncda.children.detailSubtitle}
          size="compact"
        />
        <PageContent>
          <div className="mb-3">{backLink}</div>
          <LiveUnavailableState
            title={is404 ? ncda.children.notFound : ncda.children.detailError}
            description={ncda.children.detailError}
            action={
              <Button type="button" variant="primary" onClick={() => void detail.refetch()}>
                {ncda.children.retry}
              </Button>
            }
          />
        </PageContent>
      </PageContainer>
    )
  }

  const title = detail.data?.fullName ?? ncda.sections.children.title
  const sectionButtons: { id: OpsSection; label: string }[] = [
    { id: 'profile', label: ncda.children.sectionProfile },
    { id: 'attendance', label: ncda.children.sectionAttendance },
    { id: 'nutrition', label: ncda.children.sectionNutrition },
    { id: 'sted', label: ncda.children.sectionSted },
    { id: 'feeding', label: ncda.children.sectionFeeding },
  ]

  return (
    <PageContainer>
      <PageHeader title={title} subtitle={ncda.children.detailSubtitle} size="compact" />

      <PageContent>
        <div className="mb-4 space-y-2">
          {backLink}
          {detail.data?.registrationNumber ? (
            <p className="text-caption text-text-secondary">{detail.data.registrationNumber}</p>
          ) : null}
        </div>

        <div className="space-y-8">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label={ncda.children.opsNav}>
            {sectionButtons.map((btn) => (
              <Button
                key={btn.id}
                type="button"
                variant={section === btn.id ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => {
                  setSection(btn.id)
                  setOpsPage(1)
                }}
              >
                {btn.label}
              </Button>
            ))}
          </div>

          {section === 'profile' ? (
            <NcdaDashboardSection
              title={ncda.children.identityTitle}
              isLoading={detail.isLoading && !detail.data}
              isError={false}
            >
              {detail.data ? (
                <Card padding="md" className="border-border">
                  <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-body">
                    <Field label={ncda.children.colName} value={detail.data.fullName} />
                    <Field
                      label={ncda.children.colReg}
                      value={detail.data.registrationNumber || '—'}
                    />
                    <Field
                      label={ncda.children.colStatus}
                      value={statusLabel(detail.data.status)}
                    />
                    <Field label={ncda.children.colDob} value={formatDate(detail.data.dateOfBirth)} />
                    <Field label={ncda.children.colGender} value={detail.data.gender} />
                    <Field
                      label={ncda.children.colRegistered}
                      value={formatDate(detail.data.registeredAt)}
                    />
                    <Field
                      label={ncda.children.colCenter}
                      value={detail.data.centerName || '—'}
                    />
                    <Field label={ncda.children.colDistrict} value={detail.data.district || '—'} />
                    <Field label={ncda.children.colProvince} value={detail.data.province || '—'} />
                    <Field label={ncda.children.colSector} value={detail.data.sector || '—'} />
                    <Field label={ncda.children.colCell} value={detail.data.cell || '—'} />
                    <Field label={ncda.children.colVillage} value={detail.data.village || '—'} />
                    <Field
                      label={ncda.children.colGuardian}
                      value={detail.data.guardianName || '—'}
                    />
                    <Field
                      label={ncda.children.colGuardianPhone}
                      value={detail.data.guardianPhone || '—'}
                    />
                    <Field
                      label={ncda.children.colSpecialNeeds}
                      value={detail.data.specialNeeds || '—'}
                    />
                    {detail.data.centerId ? (
                      <div>
                        <dt className="text-caption text-text-secondary">
                          {ncda.children.colCenter}
                        </dt>
                        <dd>
                          <Link
                            to={`${NCDA_PATHS.centers}/${detail.data.centerId}`}
                            className="text-primary font-semibold hover:underline"
                          >
                            {ncda.children.openCenter}
                          </Link>
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                </Card>
              ) : null}
            </NcdaDashboardSection>
          ) : null}

          {section === 'attendance' ? (
            <OpsTableSection
              title={ncda.children.sectionAttendance}
              query={attendanceQ}
              page={opsPage}
              onPageChange={setOpsPage}
              empty={ncda.children.opsEmpty}
              error={ncda.children.opsError}
              columns={[
                ncda.children.opsColDate,
                ncda.children.opsColStatus,
                ncda.children.opsColMeta,
              ]}
              rows={(attendanceQ.data?.items ?? []).map((row) => [
                row.date?.slice(0, 10) ?? '—',
                row.present ? ncda.children.statusPresent : ncda.children.statusAbsent,
                row.absentReason ?? row.notes ?? '—',
              ])}
              total={attendanceQ.data?.total ?? 0}
              totalPages={attendanceQ.data?.totalPages ?? 1}
            />
          ) : null}

          {section === 'nutrition' ? (
            <OpsTableSection
              title={ncda.children.sectionNutrition}
              query={nutritionQ}
              page={opsPage}
              onPageChange={setOpsPage}
              empty={ncda.children.opsEmpty}
              error={ncda.children.opsError}
              columns={[
                ncda.children.opsColDate,
                ncda.children.opsColStatus,
                ncda.children.opsColMeta,
              ]}
              rows={(nutritionQ.data?.items ?? []).map((row) => [
                row.screeningDate?.slice(0, 10) ?? '—',
                row.nutritionStatus ?? '—',
                `MUAC ${row.muacCm ?? '—'} · ${row.weightKg ?? '—'} kg`,
              ])}
              total={nutritionQ.data?.total ?? 0}
              totalPages={nutritionQ.data?.totalPages ?? 1}
            />
          ) : null}

          {section === 'sted' ? (
            <OpsTableSection
              title={ncda.children.sectionSted}
              query={stedQ}
              page={opsPage}
              onPageChange={setOpsPage}
              empty={ncda.children.opsEmpty}
              error={ncda.children.opsError}
              columns={[
                ncda.children.opsColDate,
                ncda.children.opsColMeta,
                ncda.children.opsColStatus,
              ]}
              rows={(stedQ.data?.items ?? []).map((row) => [
                row.assessmentDate?.slice(0, 10) ?? '—',
                row.ageBand ?? '—',
                row.outcome?.referred
                  ? ncda.children.stedReferred
                  : row.outcome?.normal
                    ? ncda.children.stedNormal
                    : '—',
              ])}
              total={stedQ.data?.total ?? 0}
              totalPages={stedQ.data?.totalPages ?? 1}
            />
          ) : null}

          {section === 'feeding' ? (
            <Card padding="md" className="border-border">
              <h2 className="text-subheading font-semibold text-text mb-2">
                {ncda.children.sectionFeeding}
              </h2>
              <p className="text-body text-text-secondary">{ncda.children.sectionUnavailable}</p>
            </Card>
          ) : null}
        </div>
      </PageContent>
    </PageContainer>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-caption text-text-secondary">{label}</dt>
      <dd className="font-semibold text-text">{value}</dd>
    </div>
  )
}

function statusLabel(status: string): string {
  if (status === 'active') return ncda.children.statusActive
  if (status === 'transferred') return ncda.children.statusTransferred
  if (status === 'archived') return ncda.children.statusArchived
  return status
}

type OpsQueryLike = {
  isLoading: boolean
  isError: boolean
  data?: unknown
  refetch: () => Promise<unknown>
}

function OpsTableSection({
  title,
  query,
  page,
  onPageChange,
  empty,
  error,
  columns,
  rows,
  total,
  totalPages,
}: {
  title: string
  query: OpsQueryLike
  page: number
  onPageChange: (page: number) => void
  empty: string
  error: string
  columns: string[]
  rows: string[][]
  total: number
  totalPages: number
}) {
  const startIndex = total === 0 ? 0 : (page - 1) * OPS_PAGE_SIZE + 1
  const endIndex = total === 0 ? 0 : Math.min(page * OPS_PAGE_SIZE, total)

  return (
    <section className="space-y-3" aria-label={title}>
      <h2 className="text-subheading font-semibold text-text">{title}</h2>
      <Card padding="md" className="border-border">
        {query.isError && !query.data ? (
          <div className="space-y-3">
            <p className="text-body text-text-secondary">{error}</p>
            <Button type="button" variant="primary" onClick={() => void query.refetch()}>
              {ncda.children.retry}
            </Button>
          </div>
        ) : query.isLoading && !query.data ? (
          <div className="space-y-2" aria-busy="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} height="2.5rem" className="w-full" rounded="md" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="text-body text-text-secondary">{empty}</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-0 sm:min-w-[28rem] text-left text-body responsive-table-cards">
                <thead>
                  <tr className="border-b border-border text-caption text-text-secondary">
                    {columns.map((col) => (
                      <th key={col} className="py-2 pr-3 font-semibold">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={idx} className="border-b border-border/70">
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          data-label={columns[cIdx]}
                          className={`py-2.5 pr-3 ${cIdx === 0 ? 'font-medium text-text' : 'text-text-secondary'}`}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              pageSize={OPS_PAGE_SIZE}
              total={total}
              totalPages={totalPages}
              startIndex={startIndex}
              endIndex={endIndex}
              hasPrevious={page > 1}
              hasNext={page < totalPages}
              onPageChange={onPageChange}
              onPageSizeChange={() => {
                /* Fixed ops page size — national-safe bounded reads. */
              }}
              pageSizeSelectId={`ncda-child-ops-${title.replace(/\s+/g, '-').toLowerCase()}`}
            />
          </>
        )}
      </Card>
    </section>
  )
}
