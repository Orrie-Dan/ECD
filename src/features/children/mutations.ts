import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { children } from '@/api/query-keys'
import {
  archiveChildRequest,
  createChildRequest,
  reactivateChildRequest,
  resolveHomeVillageId,
  transferChildRequest,
  updateChildRequest,
} from '@/api/resources/children'
import type { ChildViewModel } from '@/models/child'
import type {
  ArchiveChildInput,
  Child,
  ChildRegistrationForm,
  TransferChildInput,
} from '@/types'
import { getProvinceDisplayName } from '@/lib/rwanda-admin'

/** Shared invalidation for children list + optional detail. */
export async function invalidateChildrenQueries(queryClient: QueryClient, id?: string) {
  const tasks = [queryClient.invalidateQueries({ queryKey: children.keys.lists() })]
  if (id) {
    tasks.push(queryClient.invalidateQueries({ queryKey: children.keys.detail(id) }))
  }
  await Promise.all(tasks)
}

export function useCreateChild() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      form: ChildRegistrationForm
      centerId: string
    }) => {
      const homeVillageId = await resolveHomeVillageId({
        district: input.form.district,
        sector: input.form.sector,
        cell: input.form.cell,
        village: input.form.village,
      })
      return createChildRequest(input.form, {
        centerId: input.centerId,
        homeVillageId,
      })
    },
    onSuccess: () => {
      void invalidateChildrenQueries(queryClient)
    },
  })
}

export function useUpdateChild() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      child: ChildViewModel
      patch: Partial<Child>
      form?: ChildRegistrationForm
    }) => {
      let patch = { ...input.patch }
      if (input.form) {
        const homeVillageId = await resolveHomeVillageId({
          district: input.form.district,
          sector: input.form.sector,
          cell: input.form.cell,
          village: input.form.village,
        })
        patch = {
          ...patch,
          homeVillageId,
          province: getProvinceDisplayName(input.form.province) || input.form.province,
          district: input.form.district,
          sector: input.form.sector,
          cell: input.form.cell,
          village: input.form.village,
        } as Partial<Child> & { homeVillageId: string }
      }
      return updateChildRequest(input.child, patch)
    },
    onSuccess: (data) => {
      void invalidateChildrenQueries(queryClient, data.id)
    },
  })
}

export function useArchiveChild() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { child: ChildViewModel; data: ArchiveChildInput }) =>
      archiveChildRequest(input.child, input.data),
    onSuccess: (data) => {
      void invalidateChildrenQueries(queryClient, data.id)
    },
  })
}

export function useReactivateChild() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (child: ChildViewModel) => reactivateChildRequest(child),
    onSuccess: (data) => {
      void invalidateChildrenQueries(queryClient, data.id)
    },
  })
}

export function useTransferChild() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { child: ChildViewModel; data: TransferChildInput }) =>
      transferChildRequest(input.child, input.data),
    onSuccess: (data) => {
      void invalidateChildrenQueries(queryClient, data.id)
    },
  })
}
