import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ApiProviders } from '@/api/providers/ApiProviders'
import { ApiErrorBridge } from '@/api/providers/ApiErrorBridge'
import { DeviceRegistrationBridge } from '@/offline/DeviceRegistrationBridge'
import { AuthProvider, DataProvider } from '@/contexts/AppContext'
import { AttendanceAutoAbsentRuntime } from '@/components/attendance/AttendanceAutoAbsentRuntime'
import { AppErrorBoundary } from '@/components/AppErrorBoundary'
import { ToastProvider } from '@/components/ui/Toast'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
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
import { TransfersPage } from '@/pages/caretaker/TransfersPage'
import { SelfEvalPage } from '@/pages/caretaker/SelfEvalPage'
import { SelfEvalWizardPage } from '@/pages/caretaker/SelfEvalWizardPage'
import { CenterUsersPage } from '@/pages/caretaker/CenterUsersPage'
import { CenterUserDetailPage } from '@/pages/caretaker/CenterUserDetailPage'
import {
  DirectorIkigoPage,
  DirectorManagementPage,
  DirectorBookHubPage,
} from '@/pages/caretaker/director/DirectorPages'
import { ParentContributionsPage } from '@/pages/caretaker/director/ParentContributionsPage'
import { ParentingSessionsPage } from '@/pages/caretaker/director/ParentingSessionsPage'
import { CommitteeMembersPage } from '@/pages/caretaker/director/CommitteeMembersPage'
import { EducatorsPage } from '@/pages/caretaker/director/EducatorsPage'
import { CenterSupportPage } from '@/pages/caretaker/director/CenterSupportPage'
import { CenterVisitorsPage } from '@/pages/caretaker/director/CenterVisitorsPage'
import { StaffTrainingsPage } from '@/pages/caretaker/director/StaffTrainingsPage'
import { CaretakerNotificationsPage } from '@/pages/caretaker/NotificationsPage'
import { CaretakerAlertsPage } from '@/pages/caretaker/AlertsPage'
import { DistrictLayout } from '@/layouts/DistrictLayout'
import { DISTRICT_PATHS } from '@/layouts/district/navigation'
import { DistrictDashboardPage } from '@/pages/district/DashboardPage'
import { CentersPage } from '@/pages/district/CentersPage'
import { CenterDetailPage } from '@/pages/district/CenterDetailPage'
import { DistrictChildrenPage } from '@/pages/district/ChildrenPage'
import { DistrictChildrenDemographicsPage } from '@/pages/district/ChildrenDemographicsPage'
import { DistrictChildDetailPage } from '@/pages/district/DistrictChildDetailPage'
import { DistrictReportsPage } from '@/pages/district/ReportsPage'
import { DistrictAttendancePage } from '@/pages/district/AttendanceMonitoringPage'
import { GrowthMonitoringPage } from '@/pages/district/GrowthMonitoringPage'
import { FeedingMonitoringPage } from '@/pages/district/FeedingMonitoringPage'
import { StedMonitoringPage } from '@/pages/district/StedMonitoringPage'
import { GukurikiranaPage } from '@/pages/district/GukurikiranaPage'
import { DistrictReferralsPage } from '@/pages/district/ReferralsPage'
import { DistrictNotificationsPage } from '@/pages/district/NotificationsPage'
import { DistrictAlertsPage } from '@/pages/district/AlertsPage'
import { DistrictMonitoringPage } from '@/pages/district/DistrictMonitoringPage'
import { DistrictSettingsPage } from '@/pages/district/SettingsPage'
import { GisAnalyticsPage } from '@/pages/district/GisAnalyticsPage'
import { DistrictCaregiversPage } from '@/pages/district/DistrictCaregiversPage'
import { DistrictCaregiverDetailPage } from '@/pages/district/DistrictCaregiverDetailPage'
import {
  DistrictRegisterHubPage,
  DistrictRegisterSectionPage,
} from '@/pages/district/registers/DistrictRegisterPages'
import { NcdaLayout } from '@/layouts/NcdaLayout'
import { NcdaNotificationsPage } from '@/pages/ncda/NotificationsPage'
import {
  NcdaDashboardPage,
  NcdaDistrictsPage,
  NcdaDistrictDetailPage,
  NcdaCentersPage,
  NcdaCenterDetailPage,
  NcdaChildrenPage,
  NcdaChildDetailPage,
  NcdaChildrenDemographicsPage,
  NcdaUsersPage,
  NcdaUserDetailPage,
  NcdaCompliancePage,
  NcdaWashPage,
  NcdaMonitoringPage,
  NcdaFollowUpPage,
  NcdaAuditLogsPage,
  NcdaAuditLogDetailPage,
  NcdaRolesPage,
  NcdaSettingsPage,
} from '@/pages/ncda/NcdaPages'
import { NcdaAttendanceMonitoringPage } from '@/pages/ncda/monitoring/NcdaAttendanceMonitoringPage'
import { NcdaGrowthMonitoringPage } from '@/pages/ncda/monitoring/NcdaGrowthMonitoringPage'
import { NcdaFeedingMonitoringPage } from '@/pages/ncda/monitoring/NcdaFeedingMonitoringPage'
import { NcdaStedMonitoringPage } from '@/pages/ncda/monitoring/NcdaStedMonitoringPage'
import {
  NcdaRegisterHubPage,
  NcdaRegisterSectionPage,
} from '@/pages/ncda/registers/NcdaRegisterPages'
import { NCDA_LEGACY_REDIRECTS, NCDA_PATHS } from '@/layouts/ncda/navigation'
import { useAuth } from '@/contexts/AppContext'
import { ECD_CENTER_ROLES, homePathForUser } from '@/api/roles'

function RedirectWithSearch({ to }: { to: string }) {
  const { search } = useLocation()
  return <Navigate to={`${to}${search}`} replace />
}

function RedirectNutritionAlertsToFollowUp() {
  const { search } = useLocation()
  const params = new URLSearchParams(search)
  if (!params.has('category')) params.set('category', 'nutrition')
  const query = params.toString()
  return <Navigate to={`${NCDA_PATHS.followUp}${query ? `?${query}` : ''}`} replace />
}

function HomeRoute() {
  const { isAuthenticated, user, isAuthLoading } = useAuth()
  if (isAuthLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background text-body text-text-secondary">
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
    <AppErrorBoundary>
      <ApiProviders>
        <BrowserRouter>
          <AuthProvider>
            <DataProvider>
              <AttendanceAutoAbsentRuntime />
              <ToastProvider>
                <ApiErrorBridge />
                <DeviceRegistrationBridge />
                <Routes>
                <Route path="/" element={<HomeRoute />} />
                <Route path="/login" element={<Navigate to="/" replace />} />
                <Route path="/login/:role" element={<LoginPage />} />

                <Route element={<ProtectedRoute allowedRole={ECD_CENTER_ROLES} />}>
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
                  <Route path="/caretaker/amatangazo" element={<CaretakerNotificationsPage />} />
                  <Route path="/caretaker/impugukirwa" element={<CaretakerAlertsPage />} />
                  <Route path="/caretaker/ibindi" element={<MorePage />} />
                  <Route path="/caretaker/igenamiterere" element={<SettingsPage />} />
                </Route>

                <Route element={<ProtectedRoute allowedRole="ecdDirector" />}>
                  <Route path="/caretaker/ikigo" element={<DirectorIkigoPage />} />
                  <Route path="/caretaker/imicungire" element={<DirectorManagementPage />} />
                  <Route path="/caretaker/igitabo" element={<DirectorBookHubPage />} />
                  <Route
                    path="/caretaker/igitabo/umusanzu"
                    element={<ParentContributionsPage />}
                  />
                  <Route
                    path="/caretaker/igitabo/ibiganiro"
                    element={<ParentingSessionsPage />}
                  />
                  <Route
                    path="/caretaker/igitabo/komite"
                    element={<CommitteeMembersPage />}
                  />
                  <Route path="/caretaker/igitabo/abarezi" element={<EducatorsPage />} />
                  <Route path="/caretaker/igitabo/ubufasha" element={<CenterSupportPage />} />
                  <Route path="/caretaker/igitabo/abashyitsi" element={<CenterVisitorsPage />} />
                  <Route path="/caretaker/igitabo/amahugurwa" element={<StaffTrainingsPage />} />
                  <Route path="/caretaker/kwimura" element={<TransfersPage />} />
                  <Route path="/caretaker/isuzuma" element={<SelfEvalPage />} />
                  <Route path="/caretaker/isuzuma/new" element={<SelfEvalWizardPage />} />
                  <Route path="/caretaker/abakoresha" element={<CenterUsersPage />} />
                  <Route path="/caretaker/abakoresha/:userId" element={<CenterUserDetailPage />} />
                </Route>

                <Route element={<ProtectedRoute allowedRole="districtOfficer" />}>
                  <Route element={<DistrictLayout />}>
                    <Route path="/district" element={<DistrictDashboardPage />} />
                    <Route path="/district/ibigo" element={<CentersPage />} />
                    <Route path="/district/ibigo/:id" element={<CenterDetailPage />} />
                    <Route path="/district/abana" element={<DistrictChildrenPage />} />
                    <Route path="/district/abana/:id" element={<DistrictChildDetailPage />} />
                    <Route
                      path="/district/demografi"
                      element={<DistrictChildrenDemographicsPage />}
                    />
                    <Route path="/district/abakoresha" element={<DistrictCaregiversPage />} />
                    <Route path="/district/abakoresha/:userId" element={<DistrictCaregiverDetailPage />} />
                    <Route path="/district/imikorere" element={<DistrictMonitoringPage />} />
                    <Route path="/district/imikorere/ubwitabire" element={<DistrictAttendancePage />} />
                    <Route path="/district/imikorere/imikurire" element={<GrowthMonitoringPage />} />
                    <Route path="/district/imikorere/imirire" element={<FeedingMonitoringPage />} />
                    <Route path="/district/imikorere/sted" element={<StedMonitoringPage />} />
                    <Route path="/district/gukurikirana" element={<GukurikiranaPage />} />
                    <Route path="/district/amatangazo" element={<DistrictNotificationsPage />} />
                    <Route path="/district/impugukirwa" element={<DistrictAlertsPage />} />
                    <Route path="/district/raporo" element={<DistrictReportsPage />} />
                    <Route path="/district/igitabo" element={<DistrictRegisterHubPage />} />
                    <Route
                      path="/district/igitabo/:section"
                      element={<DistrictRegisterSectionPage />}
                    />
                    <Route path="/district/igenamiterere" element={<DistrictSettingsPage />} />
                    <Route
                      path="/district/attendance"
                      element={<RedirectWithSearch to={DISTRICT_PATHS.monitoringAttendance} />}
                    />
                    <Route
                      path="/district/imikurire"
                      element={<RedirectWithSearch to={DISTRICT_PATHS.monitoringGrowth} />}
                    />
                    <Route
                      path="/district/imirire"
                      element={<RedirectWithSearch to={DISTRICT_PATHS.monitoringFeeding} />}
                    />
                    <Route
                      path="/district/sted"
                      element={<RedirectWithSearch to={DISTRICT_PATHS.monitoringSted} />}
                    />
                    <Route path="/district/referrals" element={<DistrictReferralsPage />} />
                    <Route
                      path="/district/gukurikirana/ivuriro"
                      element={<Navigate to="/district/referrals" replace />}
                    />
                    <Route path="/district/ikarita" element={<GisAnalyticsPage />} />
                    <Route
                      path="/district/ibikurikiranywa"
                      element={<Navigate to={DISTRICT_PATHS.followup} replace />}
                    />
                    <Route
                      path="/district/monitoring"
                      element={<RedirectWithSearch to={DISTRICT_PATHS.monitoring} />}
                    />
                    <Route
                      path="/district/follow-up"
                      element={<RedirectWithSearch to={DISTRICT_PATHS.followup} />}
                    />
                  </Route>
                </Route>

                {/* Sprint 5.5B/5.5C — NCDA Admin shell + national dashboard */}
                <Route element={<ProtectedRoute allowedRole="ncda" />}>
                  <Route element={<NcdaLayout />}>
                    <Route path="/ncda" element={<Navigate to="/ncda/dashboard" replace />} />
                    <Route path="/ncda/overview" element={<NcdaDashboardPage />} />
                    <Route path="/ncda/dashboard" element={<NcdaDashboardPage />} />
                    <Route path={NCDA_PATHS.monitoring} element={<NcdaMonitoringPage />} />
                    <Route
                      path={NCDA_PATHS.monitoringAttendance}
                      element={<NcdaAttendanceMonitoringPage />}
                    />
                    <Route
                      path={NCDA_PATHS.monitoringGrowth}
                      element={<NcdaGrowthMonitoringPage />}
                    />
                    <Route
                      path={NCDA_PATHS.monitoringFeeding}
                      element={<NcdaFeedingMonitoringPage />}
                    />
                    <Route path={NCDA_PATHS.monitoringSted} element={<NcdaStedMonitoringPage />} />
                    <Route path={NCDA_PATHS.followUp} element={<NcdaFollowUpPage />} />
                    <Route
                      path={NCDA_LEGACY_REDIRECTS.monitoring}
                      element={<RedirectWithSearch to={NCDA_PATHS.monitoring} />}
                    />
                    <Route
                      path={NCDA_LEGACY_REDIRECTS.monitoringNutrition}
                      element={<RedirectNutritionAlertsToFollowUp />}
                    />
                    <Route
                      path={NCDA_LEGACY_REDIRECTS.followUp}
                      element={<RedirectWithSearch to={NCDA_PATHS.followUp} />}
                    />
                    <Route path="/ncda/inspections" element={<NcdaCompliancePage />} />
                    <Route
                      path="/ncda/reports"
                      element={<RedirectWithSearch to="/ncda/dashboard" />}
                    />
                    <Route path="/ncda/users" element={<NcdaUsersPage />} />
                    <Route path="/ncda/users/:userId" element={<NcdaUserDetailPage />} />
                    <Route path="/ncda/roles" element={<NcdaRolesPage />} />
                    <Route path="/ncda/settings" element={<NcdaSettingsPage />} />
                    <Route path="/ncda/audit-logs" element={<NcdaAuditLogsPage />} />
                    <Route path="/ncda/audit-logs/:logId" element={<NcdaAuditLogDetailPage />} />
                    <Route path="/ncda/districts" element={<NcdaDistrictsPage />} />
                    <Route path="/ncda/districts/:districtId" element={<NcdaDistrictDetailPage />} />
                    <Route path="/ncda/centers" element={<NcdaCentersPage />} />
                    <Route path="/ncda/centers/:centerId" element={<NcdaCenterDetailPage />} />
                    <Route path="/ncda/children" element={<NcdaChildrenPage />} />
                    <Route path="/ncda/children/:childId" element={<NcdaChildDetailPage />} />
                    <Route
                      path="/ncda/demographics"
                      element={<NcdaChildrenDemographicsPage />}
                    />
                    <Route path="/ncda/igitabo" element={<NcdaRegisterHubPage />} />
                    <Route
                      path="/ncda/igitabo/:section"
                      element={<NcdaRegisterSectionPage />}
                    />
                    <Route
                      path="/ncda/compliance"
                      element={<RedirectWithSearch to="/ncda/inspections" />}
                    />
                    <Route path="/ncda/amatangazo" element={<NcdaNotificationsPage />} />
                    <Route path="/ncda/wash" element={<NcdaWashPage />} />
                    <Route
                      path="/ncda/devices"
                      element={<RedirectWithSearch to="/ncda/settings" />}
                    />
                    <Route
                      path="/ncda/sync"
                      element={<RedirectWithSearch to="/ncda/settings" />}
                    />
                    <Route path="/ncda/*" element={<Navigate to="/ncda/dashboard" replace />} />
                  </Route>
                </Route>

                <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </ToastProvider>
            </DataProvider>
          </AuthProvider>
        </BrowserRouter>
      </ApiProviders>
    </AppErrorBoundary>
  )
}
