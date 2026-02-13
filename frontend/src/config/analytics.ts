import { api } from '@/config/api';

export interface DashboardStats {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  ticketsThisMonth: number;
  totalAgents: number;
  avgResponseTime: number;
  satisfaction: number;
}

export interface TicketsByStatus {
  open: number;
  in_progress: number;
  waiting_customer: number;
  resolved: number;
  closed: number;
}

export interface TicketsByPriority {
  urgent: number;
  high: number;
  medium: number;
  low: number;
}

export interface CategoryStat {
  _id: string;
  count: number;
}

export interface TrendData {
  _id: string;
  created: number;
  resolved: number;
}

export interface AgentStat {
  _id: string;
  name: string;
  total: number;
  resolved: number;
  avgTime: number;
}

export interface SLAData {
  total: number;
  responseMet: number;
  resolutionMet: number;
  breached: number;
  responseRate: number;
  resolutionRate: number;
  breachRate: number;
}

export interface SatisfactionData {
  distribution: Record<number, number>;
  average: number;
  totalResponses: number;
}

export interface ReportsTrendPoint {
  date: string;
  created: number;
  resolved: number;
}

export interface ReportsSlaData {
  totalResolved: number;
  withinSla: number;
  outsideSla: number;
  withinRate: number;
}

export interface ReportsAgentData {
  _id: string;
  name: string;
  resolved: number;
  avgResolutionMs: number;
}

export interface ReportsKpis {
  createdCount: number;
  resolvedCount: number;
  backlogCount: number;
  avgResolutionMs: number;
  avgFirstResponseMs: number;
}

export interface ReportsSlaTrendPoint {
  date: string;
  totalResolved: number;
  withinSla: number;
  outsideSla: number;
  withinRate: number;
}

export interface ReportsData {
  range: {
    start: string;
    end: string;
  };
  kpis: ReportsKpis;
  trend: ReportsTrendPoint[];
  status: TicketsByStatus;
  sla: ReportsSlaData;
  slaTrend: ReportsSlaTrendPoint[];
  agents: ReportsAgentData[];
}

export const analyticsApi = {
  getDashboardStats: () => api.get<{ stats: DashboardStats }>('/analytics/dashboard'),
  getTicketsByStatus: () => api.get<{ data: TicketsByStatus }>('/analytics/tickets-by-status'),
  getTicketsByPriority: () => api.get<{ data: TicketsByPriority }>('/analytics/tickets-by-priority'),
  getTicketsByCategory: () => api.get<{ data: CategoryStat[] }>('/analytics/tickets-by-category'),
  getTicketsTrend: (days = 30) => api.get<{ data: TrendData[] }>(`/analytics/tickets-trend?days=${days}`),
  getTopAgents: () => api.get<{ data: AgentStat[] }>('/analytics/top-agents'),
  getSLACompliance: () => api.get<{ data: SLAData }>('/analytics/sla-compliance'),
  getSatisfactionStats: () => api.get<{ data: SatisfactionData }>('/analytics/satisfaction'),
  getRecentActivity: (limit = 10) => api.get(`/analytics/recent-activity?limit=${limit}`),
  getReports: (params?: { startDate?: string; endDate?: string; days?: number; agentLimit?: number }) =>
    api.get<{ data: ReportsData }>('/analytics/reports', { params }),
};
