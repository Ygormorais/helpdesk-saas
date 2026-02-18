import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import BackendStatusBanner from '@/components/BackendStatusBanner';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ChatProvider } from '@/contexts/ChatContext';
import { TimeTrackingProvider } from '@/contexts/TimeTrackingContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';

const LoginPage = lazy(() => import('@/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/RegisterPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const ReportsPage = lazy(() => import('@/pages/ReportsPage'));
const TicketsPage = lazy(() => import('@/pages/TicketsPage'));
const TicketDetailPage = lazy(() => import('@/pages/TicketDetailPage'));
const TicketNewPage = lazy(() => import('@/pages/TicketNewPage'));
const CategoriesPage = lazy(() => import('@/pages/CategoriesPage'));
const KnowledgeBasePage = lazy(() => import('@/pages/KnowledgeBasePage'));
const ArticleDetailPage = lazy(() => import('@/pages/ArticleDetailPage'));
const AdminArticlesPage = lazy(() => import('@/pages/AdminArticlesPage'));
const AuditLogsPage = lazy(() => import('@/pages/AuditLogsPage'));
const WebhooksPage = lazy(() => import('@/pages/WebhooksPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const TeamPage = lazy(() => import('@/pages/TeamPage'));
const ChatPage = lazy(() => import('@/pages/ChatPage'));
const SatisfactionPage = lazy(() => import('@/pages/SatisfactionPage'));
const TimeReportsPage = lazy(() => import('@/pages/TimeReportsPage'));
const PlansPage = lazy(() => import('@/pages/PlansPage'));
const LandingPage = lazy(() => import('@/pages/LandingPage'));
const PricingPage = lazy(() => import('@/pages/PricingPage'));
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage'));
const PlatformAdminTenantsPage = lazy(() => import('@/pages/PlatformAdminTenantsPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function RouteLoader() {
  return <div className="flex h-screen items-center justify-center">Loading...</div>;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Suspense fallback={<RouteLoader />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
        <Route path="/pricing" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <PricingPage />} />
        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
        <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />} />

        {/* Protected Routes */}
        <Route
          element={
            <ProtectedRoute>
              <NotificationProvider>
                <TimeTrackingProvider>
                  <ChatProvider>
                    <Layout />
                  </ChatProvider>
                </TimeTrackingProvider>
              </NotificationProvider>
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="tickets" element={<TicketsPage />} />
          <Route path="tickets/new" element={<TicketNewPage />} />
          <Route path="tickets/:id" element={<TicketDetailPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="knowledge" element={<KnowledgeBasePage />} />
          <Route path="knowledge/:slug" element={<ArticleDetailPage />} />
          <Route path="admin/articles" element={<AdminArticlesPage />} />
          <Route path="audit" element={<AuditLogsPage />} />
          <Route path="webhooks" element={<WebhooksPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="team" element={<TeamPage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="satisfaction" element={<SatisfactionPage />} />
          <Route path="time" element={<TimeReportsPage />} />
          <Route path="plans" element={<PlansPage />} />
          <Route path="platform/tenants" element={<PlatformAdminTenantsPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system">
        <AuthProvider>
          <BrowserRouter>
            <BackendStatusBanner />
            <AppRoutes />
            <Toaster />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
