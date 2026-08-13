import { DistrictOverviewCommand } from '@/components/district/overview/DistrictOverviewCommand'
import { PageContainer } from '@/components/ui/PageShell'
import { useData } from '@/contexts/AppContext'
import { env } from '@/config/env'
import type { Child, GrowthMeasurement, NutritionAssessment } from '@/types'

export function DistrictDashboardPage() {
  if (env.isLive) {
    return (
      <PageContainer>
        <DistrictOverviewCommand
          children={[] as Child[]}
          growthMeasurements={[] as GrowthMeasurement[]}
          nutritionAssessments={[] as NutritionAssessment[]}
        />
      </PageContainer>
    )
  }

  return <DistrictDashboardPageMock />
}

function DistrictDashboardPageMock() {
  const { children, growthMeasurements, nutritionAssessments } = useData()
  return (
    <PageContainer>
      <DistrictOverviewCommand
        children={children}
        growthMeasurements={growthMeasurements}
        nutritionAssessments={nutritionAssessments}
      />
    </PageContainer>
  )
}
