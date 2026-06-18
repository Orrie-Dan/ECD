import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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
import { AttendanceReportPage } from '@/pages/caretaker/AttendanceReportPage'
import { SettingsPage } from '@/pages/caretaker/SettingsPage'
import { DistrictDashboardPage } from '@/pages/district/DashboardPage'
import { CentersPage } from '@/pages/district/CentersPage'
import { GisAnalyticsPage } from '@/pages/district/GisAnalyticsPage'
import { useAuth } from '@/contexts/AppContext'

function HomeRoute() {
  const { isAuthenticated, user } = useAuth()
  if (isAuthenticated) {
    return <Navigate to={user?.role === 'caretaker' ? '/caretaker' : '/district'} replace />
  }
  return <RoleSelectionPage />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
          <ToastProvider>
            <Routes>
              <Route path="/" element={<HomeRoute />} />
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route path="/login/:role" element={<LoginPage />} />

              <Route element={<ProtectedRoute allowedRole="caretaker" />}>
                <Route path="/caretaker" element={<CaretakerDashboardPage />} />
                <Route path="/caretaker/kwiyandikisha" element={<RegisterChildPage />} />
                <Route path="/caretaker/ubwitabire" element={<AttendancePage />} />
                <Route path="/caretaker/abana" element={<ChildrenListPage />} />
                <Route path="/caretaker/abana/:id" element={<ChildDetailPage />} />
                <Route path="/caretaker/raporo" element={<AttendanceReportPage />} />
                <Route path="/caretaker/igenamiterere" element={<SettingsPage />} />
              </Route>

              <Route element={<ProtectedRoute allowedRole="districtOfficer" />}>
                <Route path="/district" element={<DistrictDashboardPage />} />
                <Route path="/district/ibigo" element={<CentersPage />} />
                <Route path="/district/ikarita" element={<GisAnalyticsPage />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ToastProvider>
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
