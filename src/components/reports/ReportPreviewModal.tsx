import type { ReactNode } from 'react'
import { Download } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { AttendanceSummaryCards } from '@/components/attendance/AttendanceSummaryCards'
import { common } from '@/locales/rw/common'
import type { AttendanceSummaryStats } from '@/lib/attendance-utils'

export interface ReportPreviewFilter {
  label: string
  value: string
}

interface ReportPreviewModalProps {
  open: boolean
  onClose: () => void
  reportTitle: string
  dateRangeLabel: string
  filters: ReportPreviewFilter[]
  summary?: AttendanceSummaryStats | null
  summaryLabels?: {
    total?: string
    present?: string
    absent?: string
    rate?: string
    late?: string
  }
  showLate?: boolean
  tablePreview: ReactNode
  exportMockNote?: string
  exportDisabled?: boolean
  onExportPdf: () => void
  onExportExcel: () => void
}

export function ReportPreviewModal({
  open,
  onClose,
  reportTitle,
  dateRangeLabel,
  filters,
  summary = null,
  summaryLabels,
  showLate = false,
  tablePreview,
  exportMockNote = common.reportPreview.exportMock,
  exportDisabled = false,
  onExportPdf,
  onExportExcel,
}: ReportPreviewModalProps) {
  const labels = common.reportPreview

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={labels.title}
      size="xl"
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-caption text-text-muted">{exportMockNote}</p>
          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
            <Button variant="tertiary" onClick={onClose} fullWidth className="sm:w-auto">
              {common.close}
            </Button>
            <Button
              variant="secondary"
              icon={<Download size={18} />}
              onClick={onExportPdf}
              fullWidth
              className="sm:w-auto"
              disabled={exportDisabled}
            >
              {labels.exportPdf}
            </Button>
            <Button
              variant="primary"
              icon={<Download size={18} />}
              onClick={onExportExcel}
              fullWidth
              className="sm:w-auto"
              disabled={exportDisabled}
            >
              {labels.exportExcel}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-background-subtle/60 p-4 space-y-3">
          <div>
            <p className="text-caption font-semibold text-text-muted uppercase tracking-wide">
              {labels.reportTitle}
            </p>
            <h3 className="text-subheading text-text mt-1">{reportTitle}</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-caption font-semibold text-text-muted">{labels.dateRange}</p>
              <p className="text-body text-text mt-1">{dateRangeLabel}</p>
            </div>
            <div>
              <p className="text-caption font-semibold text-text-muted">{labels.filtersApplied}</p>
              {filters.length === 0 ? (
                <p className="text-body text-text-secondary mt-1">{labels.noFilters}</p>
              ) : (
                <ul className="mt-1 space-y-1">
                  {filters.map((filter) => (
                    <li key={`${filter.label}-${filter.value}`} className="text-body text-text">
                      <span className="text-text-secondary">{filter.label}:</span> {filter.value}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {summary && (
          <div className="space-y-3">
            <h4 className="text-body font-semibold text-text">{labels.summary}</h4>
            <AttendanceSummaryCards
              stats={summary}
              showLate={showLate}
              compact
              labels={summaryLabels}
            />
          </div>
        )}

        <div className="space-y-3">
          <h4 className="text-body font-semibold text-text">{labels.dataPreview}</h4>
          {tablePreview}
        </div>
      </div>
    </Modal>
  )
}
