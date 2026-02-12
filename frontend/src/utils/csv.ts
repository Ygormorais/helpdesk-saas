// Simple CSV builder and downloader utilities
export function buildCSV(headers: string[], rows: any[][]): string {
  const headerLine = headers.join(',')
  const body = rows.map((r) => r.map((v) => String(v)).join(',')).join('\n')
  return [headerLine, body].filter(Boolean).join('\n')
}

export function downloadCSV(headers: string[], rows: any[][], filename: string) {
  const csv = buildCSV(headers, rows)
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function toCSVString(data: { [key: string]: any }[], keys: string[]) {
  const header = keys.join(',')
  const rows = data.map((row) => keys.map((k) => String(row[k] ?? '')))
  return [header, ...rows.map((r) => r.join(','))].join('\n')
}
