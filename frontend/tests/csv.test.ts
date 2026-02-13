import { describe, it, expect } from 'vitest'
import { buildCSV, toCSVString } from '../src/utils/csv'

describe('CSV utilities', () => {
  it('buildCSV builds simple csv', () => {
    const headers = ['a', 'b']
    const rows = [[1, 2], ['x', 'y']]
    const csv = buildCSV(headers, rows)
    expect(csv).toBe('a,b\n1,2\nx,y')
  })

  it('buildCSV escapes commas, quotes, and newlines', () => {
    const headers = ['note']
    const rows = [[`a,b`], [`he said "hi"`], [`line1\nline2`]]
    const csv = buildCSV(headers, rows)
    expect(csv).toBe('note\n"a,b"\n"he said ""hi"""\n"line1\nline2"')
  })

  it('toCSVString converts data to csv string', () => {
    const data = [{ a: 1, b: 'x' }, { a: 2, b: 'y' }]
    const s = toCSVString(data, ['a', 'b'])
    expect(s).toBe('a,b\n1,x\n2,y')
  })

  it('toCSVString escapes values', () => {
    const data = [{ a: 'a,b', b: 'x' }]
    const s = toCSVString(data, ['a', 'b'])
    expect(s).toBe('a,b\n"a,b",x')
  })
})
