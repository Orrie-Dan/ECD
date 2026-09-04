import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { env } from '@/config/env'
import { resolveCenterRouteKey } from '@/api/resources/centers'
import { resolveDistrictRouteKey } from '@/api/resources/geo'
import { isUuidLike } from '@/lib/child-routes'
import {
  buildCenterDetailPath,
  buildDistrictDetailPath,
  decodeRouteParam,
} from '@/lib/entity-routes'

/**
 * Resolve center route param (code preferred, UUID accepted) and replace UUID URLs with code.
 */
export function useResolvedCenterRoute(routeParam: string | undefined, basePath: string) {
  const navigate = useNavigate()
  const routeKey = decodeRouteParam(routeParam)

  const resolved = useQuery({
    queryKey: ['resolve-center-route', routeKey],
    queryFn: () => resolveCenterRouteKey(routeKey),
    enabled: env.isLive && Boolean(routeKey),
    staleTime: 60_000,
  })

  useEffect(() => {
    if (!resolved.data?.code) return
    if (!isUuidLike(routeKey)) return
    if (resolved.data.code === routeKey) return
    navigate(buildCenterDetailPath(basePath, resolved.data), { replace: true })
  }, [resolved.data, routeKey, basePath, navigate])

  return {
    routeKey,
    centerId: resolved.data?.id,
    code: resolved.data?.code,
    isLoading: resolved.isLoading,
    isError: resolved.isError,
    error: resolved.error,
  }
}

/**
 * Resolve district route param (code preferred, UUID accepted) and replace UUID URLs with code.
 */
export function useResolvedDistrictRoute(routeParam: string | undefined, basePath: string) {
  const navigate = useNavigate()
  const routeKey = decodeRouteParam(routeParam)

  const resolved = useQuery({
    queryKey: ['resolve-district-route', routeKey],
    queryFn: () => resolveDistrictRouteKey(routeKey),
    enabled: env.isLive && Boolean(routeKey),
    staleTime: 60_000,
  })

  useEffect(() => {
    if (!resolved.data?.code) return
    if (!isUuidLike(routeKey)) return
    if (resolved.data.code === routeKey) return
    navigate(buildDistrictDetailPath(basePath, resolved.data), { replace: true })
  }, [resolved.data, routeKey, basePath, navigate])

  return {
    routeKey,
    districtId: resolved.data?.id,
    code: resolved.data?.code,
    isLoading: resolved.isLoading,
    isError: resolved.isError,
    error: resolved.error,
  }
}
