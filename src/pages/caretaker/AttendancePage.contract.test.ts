import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

describe('Caretaker AttendancePage', () => {
  const content = fs.readFileSync(path.resolve(__dirname, 'AttendancePage.tsx'), 'utf8')

  it('shows a day roster for viewing attendance, not only mark cards', () => {
    expect(content).toContain('AttendanceDateNav')
    expect(content).toContain('AttendanceDayRoster')
    expect(content).toContain('AttendanceViewSheet')
    expect(content).toContain('buildAttendanceDayRows')
    expect(content).toContain("useState<AttendanceViewState>('all')")
    expect(content).toContain('onSelectStatus')
    expect(content).not.toContain('AttendanceCard')
    expect(content).not.toContain('AttendanceGrid')
  })

  it('records and undoes against the selected day', () => {
    expect(content).toContain('const date = selectedDate')
    expect(content).toContain('clearTodayAttendance(childId, date)')
    expect(content).toContain('date={selectedDate}')
  })
})
