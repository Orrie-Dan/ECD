import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react'
import type {
  User,
  UserRole,
  TransferChildInput,
  ArchiveChildInput,
  GrowthMeasurement,
  NutritionAssessment,
  Referral,
  ReferralStatus,
  CenterFeedingDay,
  CenterFeedingMonthSummary,
  StedAssessment,
  BalancedMealComposition,
  ChildRegistrationForm,
} from '@/types'
import {
  DEFAULT_CENTER_ID,
  DEFAULT_CENTER_NAME,
} from '@/lib/mock-data'
import type { Child, AttendanceRecord } from '@/types'
import { env } from '@/config/env'
import { normalizeApiError } from '@/api/errors'
import { useApiAuth } from '@/api/auth/ApiAuthProvider'
import { useLogin, useLogout, useCurrentUser } from '@/features/auth'
import { useChildrenRepository } from '@/features/children'
import { useAttendanceRepository } from '@/features/attendance'
import { useGrowthRepository } from '@/features/growth'
import { useNutritionRepository } from '@/features/nutrition'
import { useFeedingRepository } from '@/features/feeding'
import { useStedRepository } from '@/features/sted'
import { useReferralRepository } from '@/features/referrals'
import {
  shouldCreateNutritionReferral,
  buildNutritionReferralInput,
  shouldCreateStedReferral,
  buildStedReferralInput,
} from '@/features/referrals'
import type { ReferralCreateInput } from '@/models/referral'
import type { LoginError, LoginResult } from '@/features/auth'

interface AuthContextValue {
  user: User | null
  login: (role: UserRole) => void
  loginWithCredentials: (
    username: string,
    password: string,
    expectedRole: UserRole,
  ) => Promise<LoginResult>
  logout: () => void
  isAuthenticated: boolean
  /** True while LIVE session is hydrating from /auth/me */
  isAuthLoading: boolean
}

export interface FeedingDayInput {
  centerId: string
  date: string
  milkServed: boolean
  porridgeServed: boolean
  balancedMealServed: boolean
  composition?: BalancedMealComposition
  recordedBy?: string
}

export interface FeedingMonthSummaryInput {
  centerId: string
  yearMonth: string
  milkLiters: number
  flourKg: number
  foodSource: string
  updatedBy?: string
}

interface DataContextValue {
  children: Child[]
  /** LIVE list loading; always false in MOCK after mount */
  childrenLoading: boolean
  childrenError: boolean
  /** LIVE: empty LocalStore and REST bootstrap unavailable — show offline empty UX */
  childrenNeedOnlineBootstrap: boolean
  attendance: AttendanceRecord[]
  /** LIVE list loading; always false in MOCK after mount */
  attendanceLoading: boolean
  attendanceError: boolean
  growthMeasurements: GrowthMeasurement[]
  /** LIVE roster loading; always false in MOCK after mount */
  growthLoading: boolean
  growthError: boolean
  nutritionAssessments: NutritionAssessment[]
  /** LIVE nutrition assessments loading (shared roster). */
  nutritionLoading: boolean
  nutritionError: boolean
  referrals: Referral[]
  /** LIVE referral list loading; always false in MOCK after mount */
  referralsLoading: boolean
  referralsError: boolean
  feedingDays: CenterFeedingDay[]
  feedingSummaries: CenterFeedingMonthSummary[]
  stedAssessments: StedAssessment[]
  addChild: (
    child: Omit<
      Child,
      | 'id'
      | 'registeredAt'
      | 'status'
      | 'registrationNumber'
      | 'centerId'
      | 'centerName'
    > &
      Partial<Pick<Child, 'centerId' | 'centerName'>> & { _form?: ChildRegistrationForm },
  ) => Promise<Child>
  updateChild: (
    id: string,
    data: Partial<Child> & { _form?: ChildRegistrationForm },
  ) => Promise<void>
  transferChild: (id: string, data: TransferChildInput) => Promise<void>
  acceptTransfer: (id: string) => void
  archiveChild: (id: string, data: ArchiveChildInput) => Promise<void>
  reactivateChild: (id: string) => Promise<void>
  getIncomingTransfers: (centerId: string) => Child[]
  recordAttendance: (record: Omit<AttendanceRecord, 'id'>) => Promise<void>
  clearTodayAttendance: (childId: string) => Promise<void>
  getChildAttendance: (childId: string) => AttendanceRecord[]
  getTodayRecord: (childId: string) => AttendanceRecord | undefined
  isPresentToday: (childId: string) => boolean
  recordMeasurement: (record: Omit<GrowthMeasurement, 'id'>) => Promise<GrowthMeasurement>
  updateMeasurement: (
    id: string,
    data: Partial<Omit<GrowthMeasurement, 'id' | 'childId'>>,
  ) => Promise<void>
  deleteMeasurement: (id: string) => Promise<void>
  getChildMeasurements: (childId: string) => GrowthMeasurement[]
  getChildAssessments: (childId: string) => NutritionAssessment[]
  createReferral: (referral: ReferralCreateInput | Omit<Referral, 'id'>) => Promise<Referral>
  updateReferralStatus: (
    id: string,
    status: ReferralStatus,
    extras?: { implementedAt?: string; notes?: string },
  ) => Promise<void>
  updateReferral: (
    id: string,
    patch: { implementedAt?: string; notes?: string; status?: ReferralStatus },
  ) => Promise<void>
  getChildReferrals: (childId: string) => Referral[]
  upsertFeedingDay: (input: FeedingDayInput) => Promise<CenterFeedingDay>
  upsertFeedingMonthSummary: (
    input: FeedingMonthSummaryInput,
  ) => Promise<CenterFeedingMonthSummary>
  getFeedingDay: (centerId: string, date: string) => CenterFeedingDay | undefined
  getFeedingMonthSummary: (
    centerId: string,
    yearMonth: string,
  ) => CenterFeedingMonthSummary | undefined
  /** LIVE feeding list loading; always false in MOCK after mount */
  feedingLoading: boolean
  feedingError: boolean
  createStedAssessment: (assessment: Omit<StedAssessment, 'id'>) => Promise<StedAssessment>
  getChildStedAssessments: (childId: string) => StedAssessment[]
  /** LIVE STED roster loading; always false in MOCK after mount */
  stedLoading: boolean
  stedError: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)
const DataContext = createContext<DataContextValue | null>(null)

const DEMO_USERS: Record<UserRole, User> = {
  caretaker: {
    id: 'u1',
    name: 'Uwimana Marie',
    role: 'caretaker',
    centerId: DEFAULT_CENTER_ID,
    centerName: DEFAULT_CENTER_NAME,
  },
  districtOfficer: {
    id: 'u2',
    name: 'Niyonsenga Patrick',
    role: 'districtOfficer',
    districtName: 'Gasabo',
  },
  ncda: {
    id: 'u3',
    name: 'NCDA Admin',
    role: 'ncda',
  },
}

const DEMO_CREDENTIALS: Record<string, { password: string; role: UserRole }> = {
  umurezi: { password: '1234', role: 'caretaker' },
  akarere: { password: '1234', role: 'districtOfficer' },
  /** Explicit MOCK credential only — LIVE role comes from JWT/backend. */
  ncda: { password: '1234', role: 'ncda' },
}

function persistUiUser(user: User | null) {
  if (user) localStorage.setItem('ecd_user', JSON.stringify(user))
  else localStorage.removeItem('ecd_user')
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const apiAuth = useApiAuth()
  const loginMutation = useLogin()
  const clearLiveSession = useLogout()
  const [user, setUser] = useState<User | null>(() => {
    if (env.isLive) return null
    const stored = localStorage.getItem('ecd_user')
    return stored ? (JSON.parse(stored) as User) : null
  })

  const meQuery = useCurrentUser(env.isLive && apiAuth.status === 'authenticated' && !user)

  useEffect(() => {
    if (!env.isLive) return
    if (meQuery.data) {
      setUser(meQuery.data)
      persistUiUser(meQuery.data)
    }
  }, [meQuery.data])

  useEffect(() => {
    if (!env.isLive) return
    if (apiAuth.status === 'unauthenticated') {
      setUser(null)
      persistUiUser(null)
    }
  }, [apiAuth.status])

  const login = useCallback((role: UserRole) => {
    if (env.isLive) return
    const demoUser = DEMO_USERS[role]
    setUser(demoUser)
    persistUiUser(demoUser)
  }, [])

  const loginWithCredentials = useCallback(
    async (
      username: string,
      password: string,
      expectedRole: UserRole,
    ): Promise<LoginResult> => {
      const trimmedUsername = username.trim()

      if (!trimmedUsername) {
        return { success: false, error: 'username_required' satisfies LoginError }
      }

      if (!password) {
        return { success: false, error: 'password_required' }
      }

      if (env.isMock) {
        const account = DEMO_CREDENTIALS[trimmedUsername.toLowerCase()]

        if (!account || account.password !== password) {
          return { success: false, error: 'invalid_credentials' }
        }

        if (account.role !== expectedRole) {
          return { success: false, error: 'wrong_role' }
        }

        const demoUser = DEMO_USERS[account.role]
        setUser(demoUser)
        persistUiUser(demoUser)
        return { success: true, role: account.role, user: demoUser }
      }

      const result = await loginMutation.mutateAsync({
        username: trimmedUsername,
        password,
        expectedRole,
      })

      if (result.success) {
        setUser(result.user)
        persistUiUser(result.user)
      }

      return result
    },
    [loginMutation],
  )

  const logout = useCallback(() => {
    setUser(null)
    persistUiUser(null)
    if (env.isLive) clearLiveSession()
  }, [clearLiveSession])

  const isAuthLoading = env.isLive && apiAuth.status === 'authenticated' && !user && meQuery.isLoading

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        loginWithCredentials,
        logout,
        isAuthenticated: !!user,
        isAuthLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const childrenRepo = useChildrenRepository(user)
  const attendanceRepo = useAttendanceRepository(user)

  const {
    children: childrenList,
    childrenLoading,
    childrenError,
    childrenNeedOnlineBootstrap,
    addChild,
    updateChild,
    transferChild,
    acceptTransfer,
    archiveChild,
    reactivateChild,
    getIncomingTransfers,
  } = childrenRepo

  const childIds = useMemo(() => childrenList.map((c) => c.id), [childrenList])
  const growthRepo = useGrowthRepository(childIds, user)
  const nutritionRepo = useNutritionRepository(childIds)
  const feedingRepo = useFeedingRepository(user)
  const stedRepo = useStedRepository(childIds, user)
  const referralRepo = useReferralRepository(user, childrenList)

  const {
    attendance,
    attendanceLoading,
    attendanceError,
    recordAttendance,
    clearTodayAttendance,
    getChildAttendance,
    getTodayRecord,
    isPresentToday,
  } = attendanceRepo

  const {
    growthMeasurements,
    growthLoading,
    growthError,
    recordMeasurement: recordMeasurementRepo,
    updateMeasurement: updateMeasurementRepo,
    deleteMeasurement: deleteMeasurementRepo,
    getChildMeasurements,
  } = growthRepo

  const {
    nutritionAssessments,
    nutritionLoading,
    nutritionError,
    getChildAssessments,
    syncAssessment,
    removeAssessmentForMeasurement,
  } = nutritionRepo

  const {
    feedingDays,
    feedingSummaries,
    feedingLoading,
    feedingError,
    upsertFeedingDay,
    upsertFeedingMonthSummary,
    getFeedingDay,
    getFeedingMonthSummary,
  } = feedingRepo

  const {
    stedAssessments,
    stedLoading,
    stedError,
    createStedAssessment: createStedAssessmentRepo,
    getChildStedAssessments,
  } = stedRepo

  const {
    referrals,
    referralsLoading,
    referralsError,
    createReferral: createReferralRepo,
    updateReferralStatus: updateReferralStatusRepo,
    updateReferral: updateReferralRepo,
    getChildReferrals,
  } = referralRepo

  const createReferral = useCallback(
    async (referral: ReferralCreateInput | Omit<Referral, 'id'>) => createReferralRepo(referral),
    [createReferralRepo],
  )

  /**
   * Referral boundary:
   * - MOCK: create via referral repository after screening success.
   * - LIVE: referral CREATE is enqueued atomically with the screening in LocalStore
   *   (dependsOn screening clientOperationId). Do not REST-create here — that would
   *   race ahead of screening sync and risk orphan/duplicate referrals.
   */
  const maybeCreateNutritionReferral = useCallback(
    async (assessment: NutritionAssessment) => {
      if (env.isLive) return
      if (!shouldCreateNutritionReferral(assessment)) return
      try {
        await createReferral(buildNutritionReferralInput(assessment))
      } catch (error) {
        // Assessment already persisted — surface via ApiErrorBridge, do not roll back.
        void normalizeApiError(error)
      }
    },
    [createReferral],
  )

  const recordMeasurement = useCallback(
    async (record: Omit<GrowthMeasurement, 'id'>) => {
      const { measurement, assessment } = await recordMeasurementRepo(record)
      syncAssessment(assessment)
      await maybeCreateNutritionReferral(assessment)
      return measurement
    },
    [recordMeasurementRepo, syncAssessment, maybeCreateNutritionReferral],
  )

  const updateMeasurement = useCallback(
    async (id: string, data: Partial<Omit<GrowthMeasurement, 'id' | 'childId'>>) => {
      const result = await updateMeasurementRepo(id, data)
      if (result?.assessment) {
        syncAssessment(result.assessment)
        await maybeCreateNutritionReferral(result.assessment)
      }
    },
    [updateMeasurementRepo, syncAssessment, maybeCreateNutritionReferral],
  )

  const deleteMeasurement = useCallback(
    async (id: string) => {
      const result = await deleteMeasurementRepo(id)
      if (result?.measurementId) {
        removeAssessmentForMeasurement(result.measurementId)
      }
    },
    [deleteMeasurementRepo, removeAssessmentForMeasurement],
  )

  const updateReferralStatus = useCallback(
    async (
      id: string,
      status: ReferralStatus,
      extras?: { implementedAt?: string; notes?: string },
    ) => {
      await updateReferralStatusRepo(id, status, extras)
    },
    [updateReferralStatusRepo],
  )

  const updateReferral = useCallback(
    async (
      id: string,
      patch: { implementedAt?: string; notes?: string; status?: ReferralStatus },
    ) => {
      await updateReferralRepo(id, patch)
    },
    [updateReferralRepo],
  )

  /**
   * Referral boundary:
   * - MOCK: create via referral repository after STED success when outcome.referred.
   * - LIVE: referral is created atomically inside createStedLocalFirst
   *   (dependsOn STED clientOperationId). Do not REST-create here — that would
   *   race ahead of STED sync and risk orphan/duplicate referrals.
   */
  const createStedAssessment = useCallback(
    async (assessment: Omit<StedAssessment, 'id'>) => {
      const next = await createStedAssessmentRepo(assessment)
      if (env.isLive) return next
      if (shouldCreateStedReferral(next)) {
        try {
          await createReferral(buildStedReferralInput(next))
        } catch (error) {
          void normalizeApiError(error)
        }
      }
      return next
    },
    [createReferral, createStedAssessmentRepo],
  )

  return (
    <DataContext.Provider
      value={{
        children: childrenList,
        childrenLoading,
        childrenError,
        childrenNeedOnlineBootstrap,
        attendance,
        attendanceLoading,
        attendanceError,
        growthMeasurements,
        growthLoading,
        growthError,
        nutritionAssessments,
        nutritionLoading,
        nutritionError,
        referrals,
        referralsLoading,
        referralsError,
        feedingDays,
        feedingSummaries,
        feedingLoading,
        feedingError,
        stedAssessments,
        stedLoading,
        stedError,
        addChild,
        updateChild,
        transferChild,
        acceptTransfer,
        archiveChild,
        reactivateChild,
        getIncomingTransfers,
        recordAttendance,
        clearTodayAttendance,
        getChildAttendance,
        getTodayRecord,
        isPresentToday,
        recordMeasurement,
        updateMeasurement,
        deleteMeasurement,
        getChildMeasurements,
        getChildAssessments,
        createReferral,
        updateReferralStatus,
        updateReferral,
        getChildReferrals,
        upsertFeedingDay,
        upsertFeedingMonthSummary,
        getFeedingDay,
        getFeedingMonthSummary,
        createStedAssessment,
        getChildStedAssessments,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
