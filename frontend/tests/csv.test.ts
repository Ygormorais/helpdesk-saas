import { describe, it, expect } from 'vitest'
import { buildCSV, toCSVString } from '../src/utils/csv'

describe('CSV utilities', () => {
  it('buildCSV builds simple csv', () => {
    const headers = ['a', 'b']
    const rows = [[1, 2], ['x', 'y']]
    const csv = buildCSV(headers, rows)
    expect(csv).toBe('a,b\n1,2\nx,y')
  })

  it('toCSVString converts data to csv string', () => {
    const data = [{ a: 1, b: 'x' }, { a: 2, b: 'y' }]
    const s = toCSVString(data, ['a', 'b'])
    expect(s).toBe('a,b\n1,x\n2,y')
  })
})
