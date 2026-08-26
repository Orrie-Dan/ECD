const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

/**
 * Trigger a browser download and revoke the object URL after the click.
 * Keep this adapter separate from workbook generation so tests never need a DOM save dialog.
 */
export function downloadExcelFile(data: ArrayBuffer | Uint8Array, filename: string): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    throw new Error('Excel download requires a browser')
  }

  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  const blob = new Blob([copy.buffer], { type: XLSX_MIME })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  try {
    anchor.click()
  } finally {
    document.body.removeChild(anchor)
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}
