import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { User, UserRole } from '@/types'
import { MOCK_CHILDREN, MOCK_ATTENDANCE } from '@/lib/mock-data'
import type { Child, AttendanceRecord } from '@/types'

type LoginError = 'username_required' | 'password_required' | 'invalid_credentials' | 'wrong_role'

type LoginResult =
  | { success: true; role: UserRole }
  | { success: false; error: LoginError }

interface AuthContextValue {
  user: User | null
  login: (role: UserRole) => void
  loginWithCredentials: (username: string, password: string, expectedRole: UserRole) => LoginResult
  logout: () => void
  isAuthenticated: boolean
}

interface DataContextValue {
  children: Child[]
  attendance: AttendanceRecord[]
  addChild: (child: Omit<Child, 'id' | 'registeredAt'>) => void
  updateChild: (id: string, data: Partial<Child>) => void
  recordAttendance: (record: Omit<AttendanceRecord, 'id'>) => void
  clearTodayAttendance: (childId: string) => void
  getChildAttendance: (childId: string) => AttendanceRecord[]
  getTodayRecord: (childId: string) => AttendanceRecord | undefined
  isPresentToday: (childId: string) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)
const DataContext = createContext<DataContextValue | null>(null)

const DEMO_USERS: Record<UserRole, User> = {
  caretaker: {
    id: 'u1',
    name: 'Uwimana Marie',
    role: 'caretaker',
    centerName: 'Ikigo cya ECD Remera',
  },
  districtOfficer: {
    id: 'u2',
    name: 'Niyonsenga Patrick',
    role: 'districtOfficer',
    districtName: 'Gasabo',
  },
}

const DEMO_CREDENTIALS: Record<string, { password: string; role: UserRole }> = {
  umurezi: { password: '1234', role: 'caretaker' },
  akarere: { password: '1234', role: 'districtOfficer' },
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('ecd_user')
    return stored ? JSON.parse(stored) : null
  })

  const login = useCallback((role: UserRole) => {
    const demoUser = DEMO_USERS[role]
    setUser(demoUser)
    localStorage.setItem('ecd_user', JSON.stringify(demoUser))
  }, [])

  const loginWithCredentials = useCallback(
    (username: string, password: string, expectedRole: UserRole): LoginResult => {
      const trimmedUsername = username.trim()

      if (!trimmedUsername) {
        return { success: false, error: 'username_required' }
      }

      if (!password) {
        return { success: false, error: 'password_required' }
      }

      const account = DEMO_CREDENTIALS[trimmedUsername.toLowerCase()]

      if (!account || account.password !== password) {
        return { success: false, error: 'invalid_credentials' }
      }

      if (account.role !== expectedRole) {
        return { success: false, error: 'wrong_role' }
      }

      const demoUser = DEMO_USERS[account.role]
      setUser(demoUser)
      localStorage.setItem('ecd_user', JSON.stringify(demoUser))
      return { success: true, role: account.role }
    },
    [],
  )

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem('ecd_user')
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, loginWithCredentials, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [childrenList, setChildrenList] = useState<Child[]>(MOCK_CHILDREN)
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(MOCK_ATTENDANCE)

  const addChild = useCallback((child: Omit<Child, 'id' | 'registeredAt'>) => {
    const newChild: Child = {
      ...child,
      id: String(Date.now()),
      registeredAt: new Date().toISOString().split('T')[0],
    }
    setChildrenList((prev) => [...prev, newChild])
  }, [])

  const updateChild = useCallback((id: string, data: Partial<Child>) => {
    setChildrenList((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)))
  }, [])

  const recordAttendance = useCallback((record: Omit<AttendanceRecord, 'id'>) => {
    setAttendance((prev) => {
      const filtered = prev.filter(
        (a) => !(a.childId === record.childId && a.date === record.date)
      )
      const existing = prev.find(
        (a) => a.childId === record.childId && a.date === record.date
      )
      const arrivedAt =
        record.arrivedAt ??
        (record.present ? (existing?.arrivedAt ?? new Date().toISOString()) : undefined)

      return [...filtered, { ...record, id: String(Date.now()), arrivedAt }]
    })
  }, [])

  const clearTodayAttendance = useCallback((childId: string) => {
    const today = new Date().toISOString().split('T')[0]
    setAttendance((prev) => prev.filter((a) => !(a.childId === childId && a.date === today)))
  }, [])

  const getTodayRecord = useCallback(
    (childId: string) => {
      const today = new Date().toISOString().split('T')[0]
      return attendance.find((a) => a.childId === childId && a.date === today)
    },
    [attendance]
  )

  const getChildAttendance = useCallback(
    (childId: string) => attendance.filter((a) => a.childId === childId),
    [attendance]
  )

  const isPresentToday = useCallback(
    (childId: string) => {
      const today = new Date().toISOString().split('T')[0]
      return attendance.some((a) => a.childId === childId && a.date === today && a.present)
    },
    [attendance]
  )

  return (
    <DataContext.Provider
      value={{
        children: childrenList,
        attendance,
        addChild,
        updateChild,
        recordAttendance,
        clearTodayAttendance,
        getChildAttendance,
        getTodayRecord,
        isPresentToday,
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
