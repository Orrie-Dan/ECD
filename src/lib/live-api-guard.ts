import { env } from '@/config/env'
import { auth } from '@/locales/rw/auth'

/** Production build deployed without LIVE API env — writes must not fake-persist in MOCK. */
export function isProductionMockWritesBlocked(): boolean {
  return env.isProductionMock
}

export const productionMockWriteBlockedMessage = auth.login.apiUnavailable

export class ProductionMockWritesBlockedError extends Error {
  constructor() {
    super('PRODUCTION_MOCK_WRITES_BLOCKED')
    this.name = 'ProductionMockWritesBlockedError'
  }
}

/** Throws when a production MOCK build attempts a caretaker or LIVE write. */
export function assertLiveApiWritesAvailable(): void {
  if (isProductionMockWritesBlocked()) {
    throw new ProductionMockWritesBlockedError()
  }
}
