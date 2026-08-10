import { useQuery } from '@tanstack/react-query'
import { env } from '@/config/env'
import { auth, queryStaleTimes } from '@/api/query-keys'
import { fetchCurrentUser } from '@/api/resources/auth'

/** LIVE session user from GET /auth/me. Disabled in MOCK. */
export function useCurrentUser(enabled = true) {
  return useQuery({
    queryKey: auth.keys.me(),
    queryFn: fetchCurrentUser,
    enabled: env.isLive && enabled,
    staleTime: queryStaleTimes.authMe,
  })
}
