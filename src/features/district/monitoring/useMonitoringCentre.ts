import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

/** Shared Imikorere school scope, preserved across Ubwitabire / Imikurire / Imirire / STED. */
export const MONITORING_CENTRE_PARAM = 'centre'

export function useMonitoringCentre() {
  const [params, setParams] = useSearchParams()
  const raw = params.get(MONITORING_CENTRE_PARAM)?.trim()
  const centreId = raw ? raw : null

  const setCentreId = useCallback(
    (id: string | null | undefined) => {
      const next = new URLSearchParams(params)
      const trimmed = id?.trim()
      if (!trimmed || trimmed === 'all') next.delete(MONITORING_CENTRE_PARAM)
      else next.set(MONITORING_CENTRE_PARAM, trimmed)
      if (next.toString() === params.toString()) return
      setParams(next, { replace: true })
    },
    [params, setParams],
  )

  return { centreId, setCentreId }
}
