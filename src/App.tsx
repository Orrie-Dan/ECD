import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ApiProviders } from '@/api/providers/ApiProviders'
import { ApiErrorBridge } from '@/api/providers/ApiErrorBridge'
import { AuthProvider, DataProvider } from '@/contexts/AppContext'
import { ToastProvider } from '@/components/ui/Toast'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { LoginPage } from '@/pages/LoginPage'
import { RoleSelectionPage } from '@/pages/RoleSelectionPage'
import { CaretakerDashboardPage } from '@/pages/caretaker/DashboardPage'
import { RegisterChildPage } from '@/pages/caretaker/RegisterChildPage'
import { AttendancePage } from '@/pages/caretaker/AttendancePage'
import { ChildrenListPage } from '@/pages/caretaker/ChildrenListPage'
import { ChildDetailPage } from '@/pages/caretaker/ChildDetailPage'
import { EditChildPage } from '@/pages/caretaker/EditChildPage'
import { AttendanceReportPage } from '@/pages/caretaker/AttendanceReportPage'
import { GrowthPage } from '@/pages/caretaker/GrowthPage'
import { MonthlyGrowthRosterPage } from '@/pages/caretaker/MonthlyGrowthRosterPage'
import { ImirirePage } from '@/pages/caretaker/ImirirePage'
import { ImirireMonthlyPage } from '@/pages/caretaker/ImirireMonthlyPage'
import { StedPage } from '@/pages/caretaker/StedPage'
import { StedWizardPage } from '@/pages/caretaker/StedWizardPage'
import { StedHistoryPage } from '@/pages/caretaker/StedHistoryPage'
import { SettingsPage } from '@/pages/caretaker/SettingsPage'
import { MorePage } from '@/pages/caretaker/MorePage'
import { DistrictDashboardPage } from '@/pages/district/DashboardPage'
import { CentersPage } from '@/pages/district/CentersPage'
import { CenterDetailPage } from '@/pages/district/CenterDetailPage'
import { DistrictChildrenPage } from '@/pages/district/ChildrenPage'
import { DistrictChildDetailPage } from '@/pages/district/DistrictChildDetailPage'
import { DistrictReportsPage } from '@/pages/district/ReportsPage'
import { DistrictAttendancePage } from '@/pages/district/AttendanceMonitoringPage'
import { GrowthMonitoringPage } from '@/pages/district/GrowthMonitoringPage'
import { FeedingMonitoringPage } from '@/pages/district/FeedingMonitoringPage'
import { StedMonitoringPage } from '@/pages/district/StedMonitoringPage'
import { GisAnalyticsPage } from '@/pages/district/GisAnalyticsPage'
import { GukurikiranaPage } from '@/pages/district/GukurikiranaPage'
import { DistrictSettingsPage } from '@/pages/district/SettingsPage'
import { useAuth } from '@/contexts/AppContext'
import { homePathForUser } from '@/api/roles'

function HomeRoute() {
  const { isAuthenticated, user, isAuthLoading } = useAuth()
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-body text-text-secondary">
        …
      </div>
    )
  }
  if (isAuthenticated) {
    return <Navigate to={homePathForUser(user)} replace />
  }
  return <RoleSelectionPage />
}

export default function App() {
  return (
    <ApiProviders>
      <BrowserRouter>
        <AuthProvider>
          <DataProvider>
            <ToastProvider>
              <ApiErrorBridge />
              <Routes>
                <Route path="/" element={<HomeRoute />} />
                <Route path="/login" element={<Navigate to="/" replace />} />
                <Route path="/login/:role" element={<LoginPage />} />

                <Route element={<ProtectedRoute allowedRole="caretaker" />}>
                  <Route path="/caretaker" element={<CaretakerDashboardPage />} />
                  <Route path="/caretaker/kwiyandikisha" element={<RegisterChildPage />} />
                  <Route path="/caretaker/ubwitabire" element={<AttendancePage />} />
                  <Route path="/caretaker/imikurire" element={<GrowthPage />} />
                  <Route path="/caretaker/imikurire/ukwezi" element={<MonthlyGrowthRosterPage />} />
                  <Route path="/caretaker/imirire" element={<ImirirePage />} />
                  <Route path="/caretaker/imirire/raporo" element={<ImirireMonthlyPage />} />
                  <Route path="/caretaker/sted" element={<StedPage />} />
                  <Route path="/caretaker/sted/new" element={<StedWizardPage />} />
                  <Route path="/caretaker/sted/amateka" element={<StedHistoryPage />} />
                  <Route path="/caretaker/abana" element={<ChildrenListPage />} />
                  <Route path="/caretaker/abana/:id" element={<ChildDetailPage />} />
                  <Route path="/caretaker/abana/:id/hindura" element={<EditChildPage />} />
                  <Route path="/caretaker/raporo" element={<AttendanceReportPage />} />
                  <Route path="/caretaker/ibindi" element={<MorePage />} />
                  <Route path="/caretaker/igenamiterere" element={<SettingsPage />} />
                </Route>

                <Route element={<ProtectedRoute allowedRole="districtOfficer" />}>
                  <Route path="/district" element={<DistrictDashboardPage />} />
                  <Route path="/district/ibigo" element={<CentersPage />} />
                  <Route path="/district/ibigo/:id" element={<CenterDetailPage />} />
                  <Route path="/district/abana" element={<DistrictChildrenPage />} />
                  <Route path="/district/abana/:id" element={<DistrictChildDetailPage />} />
                  <Route path="/district/attendance" element={<DistrictAttendancePage />} />
                  <Route path="/district/imikurire" element={<GrowthMonitoringPage />} />
                  <Route path="/district/imirire" element={<FeedingMonitoringPage />} />
                  <Route path="/district/sted" element={<StedMonitoringPage />} />
                  <Route path="/district/raporo" element={<DistrictReportsPage />} />
                  <Route path="/district/ikarita" element={<GisAnalyticsPage />} />
                  <Route path="/district/gukurikirana" element={<GukurikiranaPage />} />
                  <Route
                    path="/district/ibikurikiranywa"
                    element={<Navigate to="/district/gukurikirana" replace />}
                  />
                  <Route path="/district/igenamiterere" element={<DistrictSettingsPage />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </ToastProvider>
          </DataProvider>
        </AuthProvider>
      </BrowserRouter>
    </ApiProviders>
  )
}
