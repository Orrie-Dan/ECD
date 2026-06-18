import { useState } from 'react'
import { CaretakerLayout } from '@/layouts/CaretakerLayout'
import { StatCard } from '@/components/ui/Card'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { AttendanceViewSheet } from '@/components/caretaker/attendance/AttendanceViewSheet'
import { useData } from '@/contexts/AppContext'
import { caretaker } from '@/locales/rw/caretaker'
import { formatDate } from '@/lib/mock-data'
import { getTodayDate } from '@/lib/attendance-utils'
import { Users, UserCheck, UserX, TrendingUp, Eye } from 'lucide-react'
import type { AttendanceRecord, Child } from '@/types'

export function AttendanceReportPage() {
  const { children, attendance, isPresentToday } = useData()
  const [viewEntry, setViewEntry] = useState<{ child: Child; record: AttendanceRecord } | null>(null)

  const today = getTodayDate()
  const presentCount = children.filter((c) => isPresentToday(c.id)).length
  const absentCount = children.length - presentCount
  const rate = children.length > 0 ? Math.round((presentCount / children.length) * 100) : 0

  const getTodayRecord = (childId: string) =>
    attendance.find((a) => a.childId === childId && a.date === today)

  return (
    <CaretakerLayout>
      <p className="text-body-lg text-text-secondary mb-6">{caretaker.report.subtitle}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard label={caretaker.report.registered} value={children.length} icon={<Users size={22} className="text-primary" />} />
        <StatCard label={caretaker.report.present} value={presentCount} icon={<UserCheck size={22} className="text-success" />} variant="success" />
        <StatCard label={caretaker.report.absent} value={absentCount} icon={<UserX size={22} className="text-text-muted" />} />
        <StatCard
          label={caretaker.report.rate}
          value={`${rate}%`}
          icon={<TrendingUp size={22} className="text-secondary" />}
          variant={rate >= 70 ? 'success' : 'warning'}
        />
      </div>

      <Card padding="lg">
        <h3 className="text-subheading text-text mb-5">Urutonde rw'Abaje Uyu Munsi</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border">
                <th className="text-caption font-semibold text-text-muted pb-3 pr-4">Umwana</th>
                <th className="text-caption font-semibold text-text-muted pb-3 pr-4 hidden sm:table-cell">Umubyeyi</th>
                <th className="text-caption font-semibold text-text-muted pb-3 pr-4 hidden md:table-cell">{caretaker.children.dateRegistered}</th>
                <th className="text-caption font-semibold text-text-muted pb-3 pr-4">Imiterere</th>
                <th className="text-caption font-semibold text-text-muted pb-3">Ibyakora</th>
              </tr>
            </thead>
            <tbody>
              {children.map((child) => {
                const present = isPresentToday(child.id)
                const record = getTodayRecord(child.id)
                return (
                  <tr key={child.id} className="border-b border-border last:border-0">
                    <td className="py-3 pr-4 text-body font-medium text-text">{child.fullName}</td>
                    <td className="py-3 pr-4 text-body text-text-secondary hidden sm:table-cell">{child.guardianName}</td>
                    <td className="py-3 pr-4 text-body text-text-secondary hidden md:table-cell">{formatDate(child.registeredAt)}</td>
                    <td className="py-3 pr-4">
                      <span className={`text-caption font-semibold px-3 py-1 rounded-full ${
                        present ? 'bg-success-light text-success' : 'bg-background-subtle text-text-muted'
                      }`}>
                        {present ? 'Yaje ✓' : 'Ntiyaje'}
                      </span>
                    </td>
                    <td className="py-3">
                      {present && record ? (
                        <Button
                          variant="tertiary"
                          size="sm"
                          icon={<Eye size={16} />}
                          onClick={() => setViewEntry({ child, record })}
                        >
                          {caretaker.attendance.view}
                        </Button>
                      ) : (
                        <span className="text-caption text-text-muted">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <AttendanceViewSheet
        open={!!viewEntry}
        child={viewEntry?.child ?? null}
        record={viewEntry?.record ?? null}
        onClose={() => setViewEntry(null)}
      />
    </CaretakerLayout>
  )
}
