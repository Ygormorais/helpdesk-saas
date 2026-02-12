import { Router } from 'express'
const router = Router()

// Simple analytics endpoint for reports dashboard
router.get('/reports', (req, res) => {
  const data = {
    trend: [
      { date: '01', created: 12, resolved: 8 },
      { date: '02', created: 15, resolved: 12 },
      { date: '03', created: 8, resolved: 10 },
      { date: '04', created: 20, resolved: 15 },
      { date: '05', created: 18, resolved: 16 },
      { date: '06', created: 25, resolved: 20 },
    ],
    status: [
      { name: 'Aberto', value: 23, color: '#EF4444' },
      { name: 'Em Andamento', value: 42, color: '#3B82F6' },
      { name: 'Resolvido', value: 91, color: '#10B981' },
      { name: 'Fechado', value: 15, color: '#6B7280' },
    ],
    sla: [
      { name: 'Dentro do SLA', value: 85, color: '#10B981' },
      { name: 'Fora do SLA', value: 15, color: '#EF4444' }
    ],
    agents: [
      { name: 'Carlos', resolved: 45, total: 52 },
      { name: 'Maria', resolved: 38, total: 45 },
      { name: 'Pedro', resolved: 32, total: 40 }
    ],
  }
  res.json(data)
})

export default router
