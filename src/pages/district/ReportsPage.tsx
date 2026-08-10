import { FileText, Download } from 'lucide-react'
import { DistrictLayout } from '@/layouts/DistrictLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { district } from '@/locales/rw/district'

const reports = [
  {
    key: 'attendance',
    title: district.reports.attendance,
    description: district.reports.attendanceDesc,
    accent: 'green' as const,
  },
  {
    key: 'enrollment',
    title: district.reports.enrollment,
    description: district.reports.enrollmentDesc,
    accent: 'blue' as const,
  },
  {
    key: 'dropouts',
    title: district.reports.dropouts,
    description: district.reports.dropoutsDesc,
    accent: 'amber' as const,
  },
  {
    key: 'centers',
    title: district.reports.centers,
    description: district.reports.centersDesc,
    accent: 'teal' as const,
  },
  {
    key: 'sectors',
    title: district.reports.sectors,
    description: district.reports.sectorsDesc,
    accent: 'green' as const,
  },
]

const accentStyles = {
  green: 'bg-primary-light text-primary',
  blue: 'bg-secondary-light text-secondary',
  teal: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-accent-light text-accent',
}

export function DistrictReportsPage() {
  const { showSuccess } = useToast()

  const handleExport = (reportTitle: string, format: 'PDF' | 'Excel') => {
    showSuccess(`${district.reports.exportStarted} (${reportTitle} — ${format})`)
  }

  return (
    <DistrictLayout>
      <PageHeader title={district.reports.title} subtitle={district.reports.subtitle} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {reports.map((report) => (
          <Card key={report.key} padding="lg" className="flex flex-col">
            <div className="flex items-start gap-4 mb-5">
              <div
                className={`flex items-center justify-center w-12 h-12 rounded-xl shrink-0 ${accentStyles[report.accent]}`}
              >
                <FileText size={24} />
              </div>
              <div>
                <h3 className="text-subheading text-text">{report.title}</h3>
                <p className="text-body text-text-secondary mt-1">{report.description}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-auto pt-4 border-t border-border">
              <Button
                variant="secondary"
                size="md"
                icon={<Download size={18} />}
                onClick={() => handleExport(report.title, 'PDF')}
                className="flex-1 min-w-[9rem] sm:flex-none"
              >
                {district.reports.exportPdf}
              </Button>
              <Button
                variant="tertiary"
                size="md"
                icon={<Download size={18} />}
                onClick={() => handleExport(report.title, 'Excel')}
                className="flex-1 min-w-[9rem] sm:flex-none"
              >
                {district.reports.exportExcel}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </DistrictLayout>
  )
}
