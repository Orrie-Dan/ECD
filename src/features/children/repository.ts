import { useCallback, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { env } from '@/config/env'
import { asChildViewModel } from '@/api/mappers/child.mapper'
import {
  resolveHomeVillageId,
  transferChildRequest,
  updateChildRequest,
} from '@/api/resources/children'
import { useChildrenList } from '@/features/children/queries'
import { invalidateChildrenQueries } from '@/features/children/mutations'
import { createChildLocalFirst, updateChildLocalFirst, archiveChildLocalFirst, reactivateChildLocalFirst, ChildUpdateRequiresOnlineError, childPatchRequiresOnlineRest } from '@/features/children/local-children'
import { isCaretaker } from '@/api/roles'
import {
  MOCK_CHILDREN,
  DEFAULT_CENTER_ID,
  DEFAULT_CENTER_NAME,
  buildRegistrationNumber,
} from '@/lib/mock-data'
import { formToChildPayload } from '@/lib/child-form'
import { getProvinceDisplayName } from '@/lib/rwanda-admin'
import { getLocalStore } from '@/storage'
import { villageCacheKey } from '@/sync/child-sync-mapper'
import { getSyncEngine } from '@/sync/sync-engine'
import { networkState } from '@/network/network-state'
import { ChildRegistrationRequiresCenterError } from '@/offline/mutation-error-message'
import { assertLiveApiWritesAvailable } from '@/lib/live-api-guard'
import type { ChildViewModel } from '@/models/child'
import type {
  ArchiveChildInput,
  Child,
  ChildRegistrationForm,
  TransferChildInput,
  User,
} from '@/types'

type AddChildInput = Omit<
  Child,
  'id' | 'registeredAt' | 'status' | 'registrationNumber' | 'centerId' | 'centerName'
> &
  Partial<Pick<Child, 'centerId' | 'centerName'>> & {
    /** When provided (register flow), enables LIVE village resolution. */
    _form?: ChildRegistrationForm
  }

/**
 * Mode-aware children data access used by DataProvider.
 * MOCK → in-memory mock list (unchanged).
 * LIVE → LocalStore durable reads/writes + outbox; React Query is UI projection.
 */
export function useChildrenRepository(user: User | null) {
  const queryClient = useQueryClient()
  const [mockChildren, setMockChildren] = useState<Child[]>(MOCK_CHILDREN)

  const listFilters = useMemo(
    () => ({
      centerId: isCaretaker(user) ? user?.centerId : undefined,
      page: 1,
      pageSize: 100,
    }),
    [user],
  )

  // District LIVE must not hydrate caregiver LocalStore / unbounded centerless lists.
  const liveListQuery = useChildrenList(
    listFilters,
    env.isLive && !!user && isCaretaker(user),
  )

  const children: Child[] = useMemo(
    () => (env.isLive ? (liveListQuery.data?.items ?? []) : mockChildren),
    [liveListQuery.data?.items, mockChildren],
  )

  const childrenLoading = env.isLive && liveListQuery.isLoading
  const childrenError = env.isLive && liveListQuery.isError

  const findCachedChild = useCallback(
    (id: string): ChildViewModel | undefined => {
      const found = children.find((c) => c.id === id)
      return found ? asChildViewModel(found) : undefined
    },
    [children],
  )

  const addChild = useCallback(
    async (input: AddChildInput): Promise<Child> => {
      assertLiveApiWritesAvailable()
      if (env.isMock) {
        const id = String(Date.now())
        const registeredAt = new Date().toISOString().split('T')[0]
        const newChild: Child = {
          ...input,
          id,
          registeredAt,
          status: 'active',
          registrationNumber: buildRegistrationNumber(id.slice(-4), registeredAt),
          centerId: input.centerId ?? DEFAULT_CENTER_ID,
          centerName: input.centerName ?? DEFAULT_CENTER_NAME,
        }
        setMockChildren((prev) => [...prev, newChild])
        return newChild
      }

      const centerId = input.centerId ?? user?.centerId
      if (!centerId) throw new ChildRegistrationRequiresCenterError()

      const form: ChildRegistrationForm =
        input._form ??
        ({
          fullName: input.fullName,
          dateOfBirth: input.dateOfBirth,
          gender: input.gender,
          specialNeeds: input.specialNeeds ?? '',
          guardianName: input.guardianName,
          guardianPhone: input.guardianPhone,
          guardianRelation: input.guardianRelation,
          guardian2Name: input.guardian2Name ?? '',
          guardian2Phone: input.guardian2Phone ?? '',
          guardian2Relation: input.guardian2Relation ?? '',
          province: input.province,
          district: input.district,
          sector: input.sector,
          cell: input.cell,
          village: input.village,
        } as ChildRegistrationForm)

      const store = getLocalStore()
      const cacheKey = villageCacheKey({
        district: form.district,
        sector: form.sector,
        cell: form.cell,
        village: form.village,
      })
      const cached = await store.getVillageCache(cacheKey)

      let homeVillageId: string | null = cached?.homeVillageId ?? null
      let villageResolved = !!homeVillageId

      if (!homeVillageId && networkState.getSnapshot().isOnline) {
        try {
          homeVillageId = await resolveHomeVillageId({
            district: form.district,
            sector: form.sector,
            cell: form.cell,
            village: form.village,
          })
          villageResolved = true
        } catch {
          villageResolved = false
        }
      }

      const created = await createChildLocalFirst(store, {
        form,
        centerId,
        centerName: input.centerName ?? user?.centerName ?? '',
        homeVillageId,
        villageResolved,
      })

      await invalidateChildrenQueries(queryClient)

      if (networkState.getSnapshot().isOnline) {
        void getSyncEngine().syncNow()
      }

      return created
    },
    [queryClient, user?.centerId, user?.centerName],
  )

  const updateChild = useCallback(
    async (id: string, data: Partial<Child> & { _form?: ChildRegistrationForm }) => {
      assertLiveApiWritesAvailable()
      if (env.isMock) {
        setMockChildren((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)))
        return
      }

      const current = findCachedChild(id)
      if (!current) throw new Error(`Child not found: ${id}`)

      const store = getLocalStore()
      const { _form, ...patch } = data
      let nextPatch: Partial<Child> & { homeVillageId?: string } = { ...patch }

      if (_form) {
        nextPatch = {
          ...formToChildPayload(_form),
          province: getProvinceDisplayName(_form.province) || _form.province,
        }
        const existingLocal = await store.getChild(id)
        const needsOnlineFields =
          !existingLocal || childPatchRequiresOnlineRest(existingLocal, nextPatch)

        if (!needsOnlineFields) {
          await updateChildLocalFirst(store, id, nextPatch)
          await invalidateChildrenQueries(queryClient, id)
          void getSyncEngine().syncNow()
          return
        }

        if (!networkState.getSnapshot().isOnline) {
          throw new ChildUpdateRequiresOnlineError()
        }

        const homeVillageId = await resolveHomeVillageId({
          district: _form.district,
          sector: _form.sector,
          cell: _form.cell,
          village: _form.village,
        })
        nextPatch = { ...nextPatch, homeVillageId }
        await updateChildRequest(current, nextPatch)
        await invalidateChildrenQueries(queryClient, id)
        return
      }

      try {
        await updateChildLocalFirst(store, id, nextPatch)
      } catch (err) {
        if (err instanceof ChildUpdateRequiresOnlineError) {
          if (!networkState.getSnapshot().isOnline) throw err
          await updateChildRequest(current, nextPatch)
        } else {
          throw err
        }
      }
      await invalidateChildrenQueries(queryClient, id)
      void getSyncEngine().syncNow()
    },
    [findCachedChild, queryClient],
  )

  const transferChild = useCallback(
    async (id: string, data: TransferChildInput) => {
      assertLiveApiWritesAvailable()
      if (env.isMock) {
        setMockChildren((prev) =>
          prev.map((c) =>
            c.id === id
              ? {
                  ...c,
                  status: 'transferred' as const,
                  transferredAt: data.transferDate,
                  transferredToCenterId: data.destinationCenterId,
                  transferredToCenterName: data.destinationCenterName,
                  transferReason: data.reason,
                  transferNotes: data.notes,
                  transferAcceptedAt: undefined,
                }
              : c,
          ),
        )
        return
      }

      const current = findCachedChild(id)
      if (!current) throw new Error(`Child not found: ${id}`)
      await transferChildRequest(current, data)
      await invalidateChildrenQueries(queryClient, id)
    },
    [findCachedChild, queryClient],
  )

  const acceptTransfer = useCallback((id: string) => {
    // Transfer accept remains mock-local until Transfers domain migration.
    // LIVE must not fake-persist or report success — UI gates the action.
    if (env.isLive) {
      throw new Error('acceptTransfer is not available in LIVE mode until Transfers domain migration')
    }
    setMockChildren((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c
        if (c.status !== 'transferred' || !c.transferredToCenterId || !c.transferredToCenterName) {
          return c
        }
        return {
          ...c,
          status: 'active' as const,
          centerId: c.transferredToCenterId,
          centerName: c.transferredToCenterName,
          transferAcceptedAt: new Date().toISOString().split('T')[0],
        }
      }),
    )
  }, [])

  const archiveChild = useCallback(
    async (id: string, data: ArchiveChildInput) => {
      assertLiveApiWritesAvailable()
      if (env.isMock) {
        setMockChildren((prev) =>
          prev.map((c) =>
            c.id === id
              ? {
                  ...c,
                  status: 'archived' as const,
                  archivedAt: new Date().toISOString().split('T')[0],
                  archiveReason: data.reason,
                  archiveNotes: data.notes,
                }
              : c,
          ),
        )
        return
      }

      const current = findCachedChild(id)
      if (!current) throw new Error(`Child not found: ${id}`)
      await archiveChildLocalFirst(getLocalStore(), id, data)
      await invalidateChildrenQueries(queryClient, id)
      void getSyncEngine().syncNow()
    },
    [findCachedChild, queryClient],
  )

  const reactivateChild = useCallback(
    async (id: string) => {
      assertLiveApiWritesAvailable()
      if (env.isMock) {
        setMockChildren((prev) =>
          prev.map((c) =>
            c.id === id
              ? {
                  ...c,
                  status: 'active' as const,
                  archivedAt: undefined,
                  archiveReason: undefined,
                  archiveNotes: undefined,
                }
              : c,
          ),
        )
        return
      }

      const current = findCachedChild(id)
      if (!current) throw new Error(`Child not found: ${id}`)
      await reactivateChildLocalFirst(getLocalStore(), id)
      await invalidateChildrenQueries(queryClient, id)
      void getSyncEngine().syncNow()
    },
    [findCachedChild, queryClient],
  )

  const getIncomingTransfers = useCallback(
    (centerId: string) =>
      children.filter(
        (c) => c.status === 'transferred' && c.transferredToCenterId === centerId && !c.transferAcceptedAt,
      ),
    [children],
  )

  return {
    children,
    childrenLoading,
    childrenError,
    childrenNeedOnlineBootstrap: Boolean(
      env.isLive && liveListQuery.data?.needsOnlineBootstrap && children.length === 0,
    ),
    addChild,
    updateChild,
    transferChild,
    acceptTransfer,
    archiveChild,
    reactivateChild,
    getIncomingTransfers,
  }
}
