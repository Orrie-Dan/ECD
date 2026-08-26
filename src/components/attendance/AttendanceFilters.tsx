import type { ReactNode } from 'react'
import { Download } from 'lucide-react'
import { FormField, TextInput, SelectInput } from '@/components/ui/FormField'
import { Button } from '@/components/ui/Button'
import { SearchInput } from '@/components/ui/SearchInput'
import { Card } from '@/components/ui/Card'
import { caretaker } from '@/locales/rw/caretaker'
import { common } from '@/locales/rw/common'

export type ReportStatusFilter = 'all' | 'present' | 'absent' | 'unrecorded'

interface AttendanceFiltersProps {
  selectedDate: string
  maxDate: string
  statusFilter: ReportStatusFilter
  search: string
  dateFrom: string
  dateTo: string
  isToday: boolean
  isYesterday: boolean
  onDateChange: (date: string) => void
  onDateFromChange: (date: string) => void
  onDateToChange: (date: string) => void
  onStatusChange: (status: ReportStatusFilter) => void
  onSearchChange: (value: string) => void
  onSelectToday: () => void
  onSelectYesterday: () => void
  /** Opens report preview. */
  onPreviewExport?: () => void
  /** Direct Excel download for the current report view. */
  onExportExcel?: () => void
  excelLoading?: boolean
  previewNote?: string
  /** Hide unrecorded option (e.g. multi-day record history). */
  hideUnrecorded?: boolean
  /** Optional extra filter slot (e.g. center select for district). */
  extraFilter?: ReactNode
}

export function AttendanceFilters({
  selectedDate,
  maxDate,
  statusFilter,
  search,
  dateFrom,
  dateTo,
  isToday,
  isYesterday,
  onDateChange,
  onDateFromChange,
  onDateToChange,
  onStatusChange,
  onSearchChange,
  onSelectToday,
  onSelectYesterday,
  onPreviewExport,
  onExportExcel,
  excelLoading = false,
  previewNote,
  hideUnrecorded = false,
  extraFilter,
}: AttendanceFiltersProps) {
  return (
    <Card padding="lg" className="mb-6 space-y-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end">
        <div className="flex-1 min-w-0">
          <FormField label={caretaker.report.dateLabel}>
            <TextInput
              type="date"
              value={selectedDate}
              max={maxDate}
              onChange={(e) => onDateChange(e.target.value)}
              aria-label={caretaker.report.dateLabel}
            />
          </FormField>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={isToday ? 'primary' : 'secondary'}
            size="md"
            onClick={onSelectToday}
          >
            {common.today}
          </Button>
          <Button
            type="button"
            variant={isYesterday ? 'primary' : 'secondary'}
            size="md"
            onClick={onSelectYesterday}
          >
            {caretaker.report.yesterday}
          </Button>
        </div>

        <div className="w-full sm:w-48 shrink-0">
          <FormField label={caretaker.report.filterLabel}>
            <SelectInput
              value={statusFilter}
              onChange={(e) => onStatusChange(e.target.value as ReportStatusFilter)}
              aria-label={caretaker.report.filterLabel}
              className="!min-h-12 text-body font-semibold"
            >
              <option value="all">{caretaker.report.filterAll}</option>
              <option value="present">{caretaker.report.filterPresent}</option>
              <option value="absent">{caretaker.report.filterAbsent}</option>
              {!hideUnrecorded && (
                <option value="unrecorded">{caretaker.report.filterUnrecorded}</option>
              )}
            </SelectInput>
          </FormField>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label={caretaker.report.searchLabel}>
          <SearchInput
            value={search}
            onChange={onSearchChange}
            placeholder={caretaker.report.searchPlaceholder}
          />
        </FormField>

        <fieldset>
          <legend className="text-body font-semibold text-text mb-2">
            {caretaker.report.dateRange}
          </legend>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={caretaker.report.dateFrom}>
              <TextInput
                type="date"
                value={dateFrom}
                max={dateTo < maxDate ? dateTo : maxDate}
                onChange={(e) => onDateFromChange(e.target.value)}
                aria-label={caretaker.report.dateFrom}
              />
            </FormField>
            <FormField label={caretaker.report.dateTo}>
              <TextInput
                type="date"
                value={dateTo}
                min={dateFrom}
                max={maxDate}
                onChange={(e) => onDateToChange(e.target.value)}
                aria-label={caretaker.report.dateTo}
              />
            </FormField>
          </div>
        </fieldset>
      </div>

      {extraFilter}

      {(onExportExcel || onPreviewExport) && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
          {onExportExcel && (
            <Button
              type="button"
              variant="primary"
              size="md"
              icon={<Download size={18} />}
              onClick={onExportExcel}
              loading={excelLoading}
            >
              {common.reportPreview.exportExcel}
            </Button>
          )}
          {onPreviewExport && (
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onPreviewExport}
              disabled={excelLoading}
            >
              {caretaker.report.exportPreview}
            </Button>
          )}
          <p className="text-caption text-text-muted self-center">
            {previewNote ?? common.excelExport.clientSide}
          </p>
        </div>
      )}
    </Card>
  )
}
