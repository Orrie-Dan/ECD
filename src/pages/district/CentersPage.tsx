import { useState, useMemo } from 'react'
import { DistrictLayout } from '@/layouts/DistrictLayout'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { DataTable } from '@/components/ui/EmptyState'
import { ECD_CENTERS } from '@/lib/mock-data'
import { district } from '@/locales/rw/district'

export function CentersPage() {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return ECD_CENTERS
    const q = search.toLowerCase()
    return ECD_CENTERS.filter(
      (c) => c.name.toLowerCase().includes(q) || c.sector.toLowerCase().includes(q)
    )
  }, [search])

  return (
    <DistrictLayout>
      <PageHeader
        title={district.centers.title}
        subtitle={district.centers.subtitle}
      />

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder={district.centers.searchPlaceholder}
        className="mb-6 max-w-md"
      />

      <DataTable
        data={filtered}
        keyExtractor={(row) => row.id}
        columns={[
          {
            key: 'name',
            header: district.centers.centerName,
            render: (row) => <span className="font-semibold text-text">{row.name}</span>,
          },
          {
            key: 'sector',
            header: district.centers.sector,
            render: (row) => <span className="text-text-secondary">{row.sector}</span>,
          },
          {
            key: 'children',
            header: district.centers.children,
            render: (row) => <span className="font-semibold">{row.children}</span>,
          },
          {
            key: 'caretaker',
            header: district.centers.caretaker,
            render: (row) => <span className="text-text-secondary">{row.caretaker}</span>,
          },
          {
            key: 'attendance',
            header: district.centers.attendance,
            render: (row) => (
              <span className={`inline-flex px-2.5 py-1 rounded-full text-caption font-semibold ${
                row.attendance >= 70
                  ? 'bg-success-light text-success'
                  : 'bg-warning-light text-warning'
              }`}>
                {row.attendance}%
              </span>
            ),
          },
        ]}
      />
    </DistrictLayout>
  )
}
