import { describe, expect, it } from 'vitest'
import {
  buildCenterDetailPath,
  buildDistrictDetailPath,
  centerRouteKey,
  displayEntityLabel,
  districtRouteKey,
} from '@/lib/entity-routes'

describe('entity-routes', () => {
  it('prefers center code over id for route keys and hrefs', () => {
    expect(centerRouteKey({ id: '550e8400-e29b-41d4-a716-446655440000', code: 'ECD-1023' })).toBe(
      'ECD-1023',
    )
    expect(
      buildCenterDetailPath('/ncda/centers', {
        id: '550e8400-e29b-41d4-a716-446655440000',
        code: 'ECD-1023',
      }),
    ).toBe('/ncda/centers/ECD-1023')
  })

  it('falls back to id when code is missing', () => {
    expect(centerRouteKey({ id: 'c1', code: '' })).toBe('c1')
    expect(buildDistrictDetailPath('/ncda/districts', { id: 'd1' })).toBe('/ncda/districts/d1')
  })

  it('prefers district code', () => {
    expect(districtRouteKey({ id: 'uuid', code: 'GASABO' })).toBe('GASABO')
  })

  it('never displays uuid-like labels', () => {
    expect(displayEntityLabel('Uwimana Aline')).toBe('Uwimana Aline')
    expect(displayEntityLabel('550e8400-e29b-41d4-a716-446655440000')).toBe('—')
    expect(displayEntityLabel(null, 'Loading…')).toBe('Loading…')
  })
})
