export type NetworkStatus = 'ONLINE' | 'OFFLINE' | 'RECONNECTING'

export type NetworkStateSnapshot = {
  status: NetworkStatus
  isOnline: boolean
  /** Last successful API reachability probe (ISO), if any. */
  lastReachableAt: string | null
}

type Listener = (snapshot: NetworkStateSnapshot) => void

/**
 * Centralized network status. Do not read navigator.onLine in feature UI.
 * `navigator.onLine === true` is treated as a hint only — reachability may still fail.
 */
class NetworkStateService {
  private status: NetworkStatus = typeof navigator !== 'undefined' && navigator.onLine ? 'ONLINE' : 'OFFLINE'
  private lastReachableAt: string | null = null
  private listeners = new Set<Listener>()
  private started = false

  start(): void {
    if (this.started || typeof window === 'undefined') return
    this.started = true
    window.addEventListener('online', this.handleOnline)
    window.addEventListener('offline', this.handleOffline)
    this.status = navigator.onLine ? 'ONLINE' : 'OFFLINE'
    this.emit()
  }

  stop(): void {
    if (!this.started || typeof window === 'undefined') return
    window.removeEventListener('online', this.handleOnline)
    window.removeEventListener('offline', this.handleOffline)
    this.started = false
  }

  getSnapshot(): NetworkStateSnapshot {
    return {
      status: this.status,
      isOnline: this.status === 'ONLINE' || this.status === 'RECONNECTING',
      lastReachableAt: this.lastReachableAt,
    }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    listener(this.getSnapshot())
    return () => this.listeners.delete(listener)
  }

  /** Mark that we believe the API is reachable (e.g. after successful sync/auth). */
  markReachable(): void {
    this.lastReachableAt = new Date().toISOString()
    if (this.status !== 'ONLINE') {
      this.status = 'ONLINE'
      this.emit()
    }
  }

  /** Mark API unreachable while browser still reports online. */
  markUnreachable(): void {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.setStatus('OFFLINE')
      return
    }
    // Stay ONLINE at browser level but callers may treat sync errors separately.
  }

  beginReconnect(): void {
    if (this.status === 'OFFLINE' || this.status === 'RECONNECTING') {
      this.setStatus('RECONNECTING')
    }
  }

  private handleOnline = (): void => {
    this.setStatus('RECONNECTING')
  }

  private handleOffline = (): void => {
    this.setStatus('OFFLINE')
  }

  private setStatus(status: NetworkStatus): void {
    if (this.status === status) return
    this.status = status
    this.emit()
  }

  private emit(): void {
    const snap = this.getSnapshot()
    for (const listener of this.listeners) listener(snap)
  }
}

export const networkState = new NetworkStateService()
