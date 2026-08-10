import { useEffect, useState } from 'react'
import {
  networkState,
  type NetworkStateSnapshot,
} from '@/network/network-state'

export function useNetworkState(): NetworkStateSnapshot {
  const [snapshot, setSnapshot] = useState<NetworkStateSnapshot>(() => networkState.getSnapshot())

  useEffect(() => {
    networkState.start()
    return networkState.subscribe(setSnapshot)
  }, [])

  return snapshot
}

export { networkState }
export type { NetworkStatus, NetworkStateSnapshot } from '@/network/network-state'
