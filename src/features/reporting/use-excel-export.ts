import { useCallback, useRef, useState } from 'react'
import { useToast } from '@/components/ui/Toast'
import { common } from '@/locales/rw/common'
import {
  downloadExcelFile,
  exportWorkbookToFile,
  type ExcelWorkbookSpec,
} from '@/lib/export'

export function useExcelExport() {
  const { showSuccess, showError } = useToast()
  const [exporting, setExporting] = useState(false)
  const busyRef = useRef(false)

  const exportWorkbook = useCallback(
    async (spec: ExcelWorkbookSpec, filename: string) => {
      if (busyRef.current) return
      busyRef.current = true
      setExporting(true)
      try {
        await exportWorkbookToFile(spec, filename, downloadExcelFile)
        showSuccess(common.excelExport.success)
      } catch {
        showError(common.excelExport.failed)
      } finally {
        busyRef.current = false
        setExporting(false)
      }
    },
    [showError, showSuccess],
  )

  const notifyPdfUnavailable = useCallback(() => {
    showError(common.excelExport.pdfUnavailable)
  }, [showError])

  return { exporting, exportWorkbook, notifyPdfUnavailable }
}
