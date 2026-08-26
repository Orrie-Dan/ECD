/** Split bilingual checklist text formatted as `English / Kinyarwanda`. */
export function splitBilingualText(text: string): { en?: string; rw?: string } {
  const parts = text.split('/').map((p) => p.trim()).filter(Boolean)
  if (parts.length >= 2) {
    const rw = parts.slice(1).join(' / ')
    if (rw.toLowerCase() === 'nan') {
      return { rw: parts[0] }
    }
    return { en: parts[0], rw }
  }
  return { rw: text }
}

export function bilingualPrimary(text: string): string {
  const { rw, en } = splitBilingualText(text)
  return rw ?? en ?? text
}
