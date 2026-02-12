import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from 'recharts'
// Local demo analytics data (will be overridden by API data when available)
// no star icon needed here

// Simple KPI card used in the reports page
 function KPI({ title, value }: { title: string; value: string | number }) {
  return (
    <Card className="bg-white">
      <CardHeader><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent className="text-2xl font-bold">{value}</CardContent>
    </Card>
  )
}
 
 // New: filter controls and data state for reports
const _unused = 0

const mockTrendData = [
  { date: '01', created: 12, resolved: 8 },
  { date: '02', created: 15, resolved: 12 },
  { date: '03', created: 8,  resolved: 10 },
  { date: '04', created: 20, resolved: 15 },
  { date: '05', created: 18, resolved: 16 },
  { date: '06', created: 25, resolved: 20 },
]

// API data integration (fallback to mock data above) - skipped for now

 const mockStatusData = [
  { name: 'Aberto', value: 23, color: '#EF4444' },
  { name: 'Em Andamento', value: 42, color: '#3B82F6' },
  { name: 'Resolvido', value: 91, color: '#10B981' },
  { name: 'Fechado', value: 15, color: '#6B7280' },
]

// Mock SLA data for demonstration
const mockSLAdata = [
  { name: 'Dentro do SLA', value: 85, color: '#10B981' },
  { name: 'Fora do SLA', value: 15, color: '#EF4444' },
]

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

export default function ReportsPage() {
  // helper to set quick date ranges (months window)
  const setDateRangeMonths = (monthsBack: number) => {
    const today = new Date()
    const past = new Date(today)
    past.setMonth(today.getMonth() - monthsBack)
    const fmt = (d: Date) => d.toISOString().slice(0, 10)
    setStartDate(fmt(past))
    setEndDate(fmt(today))
  }
  const [reportData, setReportData] = useState<any>(null)
  useEffect(() => {
    fetch('/api/analytics/reports')
      .then((r) => r.json())
      .then((data) => {
        if (data) setReportData(data)
      })
      .catch(() => {
        // ignore errors, fallback to mocks
      })
  }, [])
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  // filtered trend based on date range (using mockTrendData as fallback)
  const filteredTrend = mockTrendData.filter((d) => {
    if (!startDate && !endDate) return true
    const s = startDate ? new Date(startDate).getTime() : new Date('2000-01-01').getTime()
    const e = endDate ? new Date(endDate).getTime() : new Date('2099-12-31').getTime()
    const dDate = new Date(d.date).getTime()
    return dDate >= s && dDate <= e
  })
  const totalTickets = filteredTrend.reduce((a, b) => a + b.created, 0)

  const statusData = reportData?.status ?? mockStatusData
  const exportCSV = () => {
    const header = 'date,created,resolved'
    const rows = filteredTrend.map((r) => `${r.date},${r.created},${r.resolved}`)
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'reports.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // New CSV exporters for additional datasets
  const exportCSV_Tickets = () => {
    const headers = ['date','created','resolved']
    const rows = filteredTrend.map(r => [r.date, r.created, r.resolved])
    // use shared CSV util
    import('@/utils/csv').then((m) => m.downloadCSV(headers, rows, 'tickets.csv'))
  }
 
  const exportCSV_Status = () => {
    const headers = ['status','count']
    const rows = (reportData?.status ?? mockStatusData).map((s: any) => [s.name, s.value])
    import('@/utils/csv').then((m) => m.downloadCSV(headers, rows, 'status.csv'))
  }
  const exportCSV_SLA = () => {
    const headers = ['label','value']
    const rows = (reportData?.sla ?? mockSLAdata).map((s: any) => [s.name, s.value])
    import('@/utils/csv').then((m) => m.downloadCSV(headers, rows, 'sla.csv'))
  }

  const exportCSV_Agents = () => {
    const headers = ['name','resolved','total']
    const rows = (reportData?.agents ?? mockAgentData).map((a: any) => [a.name, a.resolved, a.total])
    import('@/utils/csv').then((m) => m.downloadCSV(headers, rows, 'agents.csv'))
  }

  const mockAgentData = [
    { name: 'Carlos', resolved: 45, total: 52 },
    { name: 'Maria', resolved: 38, total: 45 },
    { name: 'Pedro', resolved: 32, total: 40 },
  ]

  const exportAllCSVs = () => {
    exportCSV_Tickets();
    exportCSV_Status();
    exportCSV_SLA();
    exportCSV_Agents();
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Relatórios</h1>
        <Link to="/dashboard">
          <Button>Voltar ao Dashboard</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI title="Total de Tickets" value={156} />
        <KPI title="Tickets Abertos" value={23} />
        <KPI title="Tickets Resolvidos" value={91} />
        <KPI title="Carga de Trabalhos" value={`${filteredTrend.length} dias`} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <span className="text-sm text-muted-foreground">Presets:</span>
        <button onClick={() => setDateRangeMonths(2)} className="px-3 py-1 bg-gray-100 rounded">Últimos 2 meses</button>
        <button onClick={() => setDateRangeMonths(3)} className="px-3 py-1 bg-gray-100 rounded">Últimos 3 meses</button>
        <button onClick={() => { setStartDate(''); setEndDate(''); }} className="px-3 py-1 bg-gray-100 rounded">Todos</button>
      <label className="text-sm text-muted-foreground">Filtrar mês:</label>
        <input type="date" value={startDate} onChange={(e)=>setStartDate(e.target.value)} className="border rounded px-2 py-1"/>
        <span> até </span>
        <input type="date" value={endDate} onChange={(e)=>setEndDate(e.target.value)} className="border rounded px-2 py-1"/>
        <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={exportCSV_Tickets}>Export Tickets CSV</button>
        <button className="ml-2 px-3 py-1 bg-gray-200 rounded" onClick={exportAllCSVs}>Export All CSVs</button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Tickets por Dia</CardTitle>
          </CardHeader>
        <CardContent>
            <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={filteredTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="created" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} name="Criados" />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex justify-end p-2">
              <button className="px-3 py-1 bg-gray-200 rounded" onClick={exportCSV_SLA}>Export SLA CSV</button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Estado de Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={statusData} dataKey="value" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
                  {statusData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>SLA Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={reportData?.sla ?? mockSLAdata} dataKey="value" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
                  {(reportData?.sla ?? mockSLAdata).map((entry: any, idx: number) => (
                    <Cell key={`sla-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Top Agentes</CardTitle>
            <button className="px-3 py-1 bg-gray-200 rounded" onClick={exportCSV_Agents}>Export CSV</button>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={reportData?.agents ?? mockAgentData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="resolved" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Tickets por Prioridade</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={[
                { name: 'Urgente', value: 12 },
                { name: 'Alta', value: 35 },
                { name: 'Média', value: 78 },
                { name: 'Baixa', value: 31 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Satisfação</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={[
                { rating: '5', value: 45 },
                { rating: '4', value: 32 },
                { rating: '3', value: 12 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="rating" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tickets por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={[
                { category: 'Técnico', value: 45 },
                { category: 'Financeiro', value: 23 },
                { category: 'Administrativo', value: 18 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
