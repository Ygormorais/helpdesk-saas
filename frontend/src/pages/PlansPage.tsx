import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, X, Sparkles, Zap, Building2, CreditCard, QrCode, FileText, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/config/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface Plan {
  id: string;
  name: string;
  price: number;
  interval: string;
  limits: {
    agents: string;
    tickets: string;
    storage: string;
    macros?: string;
    automations?: string;
  };
  features: {
    name: string;
    available: boolean;
    label: string;
  }[];
}

interface CurrentPlan {
  plan: string;
  effectivePlan?: string;
  isPaidAccessBlocked?: boolean;
  isTrial: boolean;
  trialDaysLeft: number;
  limits: {
    agents: { current: number; max: number };
    tickets: { current: number; max: number };
    storage: { current: number; max: number };
  };
  features: Record<string, boolean>;
  retention?: { auditDays?: number };
  addons?: { extraAgents?: number; extraStorage?: number; aiCredits?: number };
  subscription?: {
    status?: string;
    trialEndsAt?: string;
    currentPeriodStart?: string;
    currentPeriodEnd?: string;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    desiredPlan?: string;
    desiredPlanEffectiveAt?: string;
  };
}

type AddOn = {
  id: string;
  name: string;
  priceOneTime: number;
  priceMonthly: number;
  extraAgents?: number;
  extraStorage?: number;
  aiCredits?: number;
};

type AddOnRecurring = {
  addOnId: string;
  subscriptionId: string;
  status: string;
  currentPeriodEnd?: string;
  extraAgents?: number;
  extraStorage?: number;
  aiCredits?: number;
};

type AddOnOneTimePayment = {
  addOnId: string;
  paymentId: string;
  status: string;
  invoiceUrl?: string;
  value?: number;
  createdAt?: string;
  updatedAt?: string;
};

interface BillingWebhookEvent {
  eventId: string;
  event?: string;
  resourceId?: string;
  status?: string;
  error?: string;
  receivedAt?: string;
  processedAt?: string;
}

export default function PlansPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentPlan, setCurrentPlan] = useState<CurrentPlan | null>(null);
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [billingType, setBillingType] = useState<'CREDIT_CARD' | 'BOLETO' | 'PIX'>('CREDIT_CARD');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isPortalOpen, setIsPortalOpen] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalData, setPortalData] = useState<any>(null);
  const [isChangingPlan, setIsChangingPlan] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [billingEvents, setBillingEvents] = useState<BillingWebhookEvent[]>([]);
  const [billingEventsLoading, setBillingEventsLoading] = useState(false);
  const [addons, setAddons] = useState<AddOn[]>([]);
  const [addonsLoading, setAddonsLoading] = useState(false);
  const [addonsCanPurchase, setAddonsCanPurchase] = useState(false);
  const [addonsRecurring, setAddonsRecurring] = useState<AddOnRecurring[]>([]);
  const [addonsOneTime, setAddonsOneTime] = useState<AddOnOneTimePayment[]>([]);
  const [selectedAddon, setSelectedAddon] = useState<string | null>(null);
  const [addonMode, setAddonMode] = useState<'one_time' | 'monthly'>('one_time');
  const [addonBillingType, setAddonBillingType] = useState<'CREDIT_CARD' | 'BOLETO' | 'PIX'>('CREDIT_CARD');
  const [isAddonCheckoutOpen, setIsAddonCheckoutOpen] = useState(false);
  const [isAddonProcessing, setIsAddonProcessing] = useState(false);
  const { toast } = useToast();

  const selectedPlanObj = useMemo(
    () => (selectedPlan ? availablePlans.find((p) => p.id === selectedPlan) : undefined),
    [availablePlans, selectedPlan]
  );

  const addOnById = useMemo(() => {
    const m = new Map<string, AddOn>();
    addons.forEach((a) => m.set(a.id, a));
    return m;
  }, [addons]);

  const isRecurringEffective = (r: AddOnRecurring) => {
    const status = String(r.status || '').toLowerCase();
    if (status === 'active' || status === 'trialing') return true;
    if (status === 'canceled' && r.currentPeriodEnd) {
      const until = new Date(String(r.currentPeriodEnd)).getTime();
      return Number.isFinite(until) && until > Date.now();
    }
    return false;
  };

  const formatRecurringStatus = (raw: string) => {
    const s = String(raw || '').toLowerCase();
    if (s === 'active') return 'ATIVO';
    if (s === 'trialing') return 'AGUARDANDO PAGAMENTO';
    if (s === 'past_due') return 'EM ATRASO';
    if (s === 'canceled') return 'CANCELADO';
    return 'DESCONHECIDO';
  };

  const formatOneTimeStatus = (raw: string) => {
    const s = String(raw || '').toLowerCase();
    if (s === 'pending') return 'AGUARDANDO PAGAMENTO';
    if (s === 'overdue') return 'EM ATRASO';
    if (s === 'received') return 'PAGO';
    if (s === 'canceled') return 'CANCELADO';
    return 'DESCONHECIDO';
  };

  useEffect(() => {
    fetchPlanDetails();
  }, []);

  useEffect(() => {
    const checkout = String(searchParams.get('checkout') || '').trim().toLowerCase();
    if (!checkout) return;
    if (checkout !== 'pro' && checkout !== 'enterprise') return;

    // Wait for plans data, then open checkout and clean URL.
    if (!loading && availablePlans.length > 0) {
      openCheckout(checkout);
      const next = new URLSearchParams(searchParams);
      next.delete('checkout');
      setSearchParams(next, { replace: true });
    }
  }, [availablePlans.length, loading, searchParams, setSearchParams]);

  const fetchPlanDetails = async () => {
    try {
      setLoadError(null);
      setLoading(true);

      const res = await api.get('/plan');
      const data = res.data;

      setCurrentPlan(data || null);
      setAvailablePlans(Array.isArray(data?.availablePlans) ? data.availablePlans : []);

      // Best-effort: billing events are only available for admin/manager.
      fetchBillingEvents();
      fetchAddons();
    } catch (error) {
      setLoadError('Não foi possível carregar os detalhes do plano');
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os detalhes do plano',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAddons = async () => {
    setAddonsLoading(true);
    try {
      const res = await api.get('/billing/addons');
      setAddons(Array.isArray(res.data?.addons) ? res.data.addons : []);
      setAddonsCanPurchase(!!res.data?.canPurchase);
      setAddonsRecurring(Array.isArray(res.data?.recurring) ? res.data.recurring : []);
      setAddonsOneTime(Array.isArray(res.data?.pendingOneTime) ? res.data.pendingOneTime : []);
    } catch {
      setAddons([]);
      setAddonsCanPurchase(false);
      setAddonsRecurring([]);
      setAddonsOneTime([]);
    } finally {
      setAddonsLoading(false);
    }
  };

  const openAddonCheckout = (addOnId: string, mode: 'one_time' | 'monthly') => {
    setSelectedAddon(addOnId);
    setAddonMode(mode);
    setAddonBillingType('CREDIT_CARD');
    setIsAddonCheckoutOpen(true);
  };

  const processAddonCheckout = async () => {
    if (!selectedAddon) return;
    setIsAddonProcessing(true);
    try {
      const endpoint = addonMode === 'monthly' ? '/billing/addons/subscribe' : '/billing/addons/checkout';
      const res = await api.post(endpoint, { addOnId: selectedAddon, billingType: addonBillingType });
      const data = res.data;
      if (data.checkoutUrl) {
        window.open(data.checkoutUrl, '_blank');
        setIsAddonCheckoutOpen(false);
        toast({
          title: 'Redirecionando...',
          description: addonMode === 'monthly'
            ? 'Complete o pagamento na nova aba. O add-on mensal será ativado automaticamente.'
            : 'Complete o pagamento na nova aba. O add-on será aplicado automaticamente.',
        });
        // Refresh so pending payments show up.
        fetchAddons();
        return;
      }
      toast({ title: 'Checkout indisponível', description: 'Não foi possível iniciar o checkout.', variant: 'destructive' });
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error?.response?.data?.message || 'Não foi possível iniciar o checkout do add-on',
        variant: 'destructive',
      });
    } finally {
      setIsAddonProcessing(false);
    }
  };

  const cancelAddonSubscription = async (subscriptionId: string) => {
    try {
      await api.post('/billing/addons/cancel', { subscriptionId });
      toast({ title: 'Assinatura do add-on cancelada' });
      await fetchPlanDetails();
    } catch (error: any) {
      toast({
        title: 'Erro ao cancelar add-on',
        description: error?.response?.data?.message || 'Tente novamente',
        variant: 'destructive',
      });
    }
  };

  const fetchBillingEvents = async () => {
    setBillingEventsLoading(true);
    try {
      const res = await api.get('/billing/webhook-events', { params: { limit: 20 } });
      setBillingEvents(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (error: any) {
      if (error?.response?.status === 403) {
        setBillingEvents([]);
        return;
      }
      setBillingEvents([]);
    } finally {
      setBillingEventsLoading(false);
    }
  };

  const openCheckout = (planId: string) => {
    setSelectedPlan(planId);
    setBillingType('CREDIT_CARD');
    setIsCheckoutOpen(true);
  };

  const processCheckout = async () => {
    if (!selectedPlan) return;
    
    setIsProcessing(true);
    try {
      const res = await api.post('/billing/checkout', {
        plan: selectedPlan,
        billingType,
      });

      const data = res.data;
      
      if (data.checkoutUrl) {
        // Redireciona para página de pagamento Asaas
        window.open(data.checkoutUrl, '_blank');
        setIsCheckoutOpen(false);
        
        toast({
          title: 'Redirecionando...',
          description: 'Complete o pagamento na nova aba. Seu plano será ativado automaticamente.',
        });
        return;
      }

      toast({
        title: 'Checkout indisponível',
        description: 'Não foi possível iniciar o checkout. Tente novamente.',
        variant: 'destructive',
      });
    } catch (error) {
      const msg = (error as any)?.response?.data?.message;
      toast({
        title: 'Erro',
        description: msg || 'Não foi possível iniciar o checkout',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const openPortal = async () => {
    setPortalLoading(true);
    setPortalData(null);
    setIsPortalOpen(true);
    try {
      const res = await api.get('/billing/portal');
      setPortalData(res.data);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error?.response?.data?.message || 'Não foi possível carregar os dados da assinatura',
        variant: 'destructive',
      });
      setIsPortalOpen(false);
    } finally {
      setPortalLoading(false);
    }
  };

  const cancel = async () => {
    setIsCancelling(true);
    try {
      const res = await api.post('/billing/cancel');
      toast({
        title: 'Assinatura cancelada',
        description: res.data?.messageDetail || 'Seu acesso continuará até o final do período pago.',
      });
      await fetchPlanDetails();
    } catch (error: any) {
      toast({
        title: 'Erro ao cancelar',
        description: error?.response?.data?.message || 'Tente novamente',
        variant: 'destructive',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const sync = async () => {
    setIsSyncing(true);
    try {
      const res = await api.post('/billing/sync');
      toast({
        title: 'Assinatura sincronizada',
        description: 'Atualizamos o status e o período com base no Asaas.',
      });
      await fetchPlanDetails();
      setPortalData((prev: any) => (prev ? { ...prev, ...res.data?.local } : prev));
    } catch (error: any) {
      toast({
        title: 'Falha ao sincronizar',
        description: error?.response?.data?.message || 'Tente novamente',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const changePlan = async (planId: string) => {
    setIsChangingPlan(true);
    try {
      const res = await api.post('/billing/change-plan', { plan: planId });
      toast({
        title: 'Plano atualizado',
        description: res.data?.message || 'Atualizamos sua assinatura.',
      });
      await fetchPlanDetails();
    } catch (error: any) {
      toast({
        title: 'Erro ao trocar plano',
        description: error?.response?.data?.message || 'Tente novamente',
        variant: 'destructive',
      });
    } finally {
      setIsChangingPlan(false);
    }
  };

  const getUsagePercentage = (current: number, max: number) => {
    if (max === -1) return 0;
    return Math.round((current / max) * 100);
  };

  const desiredPlan = currentPlan?.subscription?.desiredPlan;
  const desiredAt = currentPlan?.subscription?.desiredPlanEffectiveAt
    ? new Date(currentPlan.subscription.desiredPlanEffectiveAt)
    : null;
  const desiredIsFuture = !!desiredAt && desiredAt.getTime() > Date.now();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Planos e Preços</h1>
          <p className="text-muted-foreground">Gerencie seu plano e faturamento</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Não foi possível carregar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{loadError}</p>
            <Button onClick={fetchPlanDetails}>Tentar novamente</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Planos e Preços</h1>
          <p className="text-muted-foreground">
            Escolha o plano ideal para sua equipe
          </p>
        </div>
        <div className="flex items-center gap-2">
          {currentPlan?.isTrial ? (
            <Badge variant="secondary" className="text-lg px-4 py-2">
              <Sparkles className="mr-2 h-4 w-4" />
              Trial PRO: {currentPlan.trialDaysLeft} dias
            </Badge>
          ) : null}
          <Button variant="outline" onClick={fetchPlanDetails} disabled={loading}>
            Atualizar
          </Button>
          {currentPlan?.subscription?.stripeSubscriptionId ? (
            <Button variant="secondary" onClick={sync} disabled={isSyncing}>
              {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
            </Button>
          ) : null}
        </div>
      </div>

      {/* Uso Atual */}
      {currentPlan && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>
                Seu Plano Atual: {(currentPlan.effectivePlan || currentPlan.plan).toUpperCase()}
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                {currentPlan.isPaidAccessBlocked ? (
                  <Badge variant="secondary" className="bg-red-100 text-red-800">
                    Acesso pago bloqueado
                  </Badge>
                ) : null}
                {currentPlan.subscription?.status ? (
                  <Badge variant="secondary" className="bg-transparent border border-border text-foreground">
                    Status: {String(currentPlan.subscription.status).toUpperCase()}
                  </Badge>
                ) : null}
                {currentPlan.subscription?.currentPeriodEnd ? (
                  <Badge variant="secondary" className="bg-transparent border border-border text-foreground">
                    Período até: {new Date(currentPlan.subscription.currentPeriodEnd).toLocaleDateString('pt-BR')}
                  </Badge>
                ) : null}
                {currentPlan.subscription?.stripeSubscriptionId ? (
                  <Button variant="secondary" size="sm" onClick={openPortal}>
                    Ver assinatura
                  </Button>
                ) : null}
                {currentPlan.subscription?.desiredPlan ? (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-900">
                    {desiredIsFuture ? 'Mudança agendada:' : 'Mudança em processamento:'} {String(desiredPlan).toUpperCase()}
                    {desiredAt ? ` em ${desiredAt.toLocaleDateString('pt-BR')}` : ''}
                  </Badge>
                ) : null}
                {currentPlan.subscription?.stripeSubscriptionId ? (
                  <Button variant="outline" size="sm" onClick={cancel} disabled={isCancelling}>
                    {isCancelling ? 'Cancelando...' : 'Cancelar assinatura'}
                  </Button>
                ) : null}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Agentes</span>
                  <span className="text-muted-foreground">
                    {currentPlan.limits.agents.current} / {currentPlan.limits.agents.max === -1 ? '∞' : currentPlan.limits.agents.max}
                  </span>
                </div>
                <Progress 
                  value={getUsagePercentage(currentPlan.limits.agents.current, currentPlan.limits.agents.max)} 
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Tickets</span>
                  <span className="text-muted-foreground">
                    {currentPlan.limits.tickets.current} / {currentPlan.limits.tickets.max === -1 ? '∞' : currentPlan.limits.tickets.max}
                  </span>
                </div>
                <Progress 
                  value={getUsagePercentage(currentPlan.limits.tickets.current, currentPlan.limits.tickets.max)} 
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Armazenamento</span>
                  <span className="text-muted-foreground">
                    {currentPlan.limits.storage.current}MB / {currentPlan.limits.storage.max === -1 ? '∞' : currentPlan.limits.storage.max}MB
                  </span>
                </div>
                <Progress 
                  value={getUsagePercentage(currentPlan.limits.storage.current, currentPlan.limits.storage.max)} 
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {(billingEventsLoading || billingEvents.length > 0) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle>Eventos recentes (Asaas)</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Ultimos webhooks recebidos e processados
                </p>
              </div>
              <Button variant="outline" onClick={fetchBillingEvents} disabled={billingEventsLoading}>
                {billingEventsLoading ? 'Atualizando...' : 'Atualizar'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {billingEventsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando...
              </div>
            ) : (
              <div className="space-y-2">
                {billingEvents.slice(0, 20).map((e) => (
                  <div key={e.eventId} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{e.event || 'evento'}</p>
                      <p className="text-xs text-muted-foreground truncate">{e.eventId}</p>
                      {e.error ? <p className="text-xs text-destructive mt-1 line-clamp-2">{e.error}</p> : null}
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant="secondary" className="bg-transparent border border-border text-foreground">
                        {String(e.status || '-').toUpperCase()}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {e.receivedAt ? new Date(e.receivedAt).toLocaleString('pt-BR') : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add-ons */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Add-ons</CardTitle>
              <p className="text-sm text-muted-foreground">Expanda limites e recursos sem trocar de plano</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchAddons} disabled={addonsLoading}>
              {addonsLoading ? 'Atualizando...' : 'Atualizar'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentPlan?.addons ? (
            <Card className="bg-muted/30">
              <CardContent className="p-4 grid gap-3 md:grid-cols-3">
                {(() => {
                  const oneTimeAgents = Number(currentPlan.addons?.extraAgents || 0) || 0;
                  const oneTimeStorage = Number(currentPlan.addons?.extraStorage || 0) || 0;
                  const oneTimeAi = Number(currentPlan.addons?.aiCredits || 0) || 0;
                  const effective = addonsRecurring.filter(isRecurringEffective);
                  const recurringAgents = effective.reduce((acc, r) => acc + (Number(r.extraAgents || 0) || 0), 0);
                  const recurringStorage = effective.reduce((acc, r) => acc + (Number(r.extraStorage || 0) || 0), 0);
                  const recurringAi = effective.reduce((acc, r) => acc + (Number(r.aiCredits || 0) || 0), 0);

                  return (
                    <div className="md:col-span-3 text-xs text-muted-foreground">
                      Totais (inclui assinaturas ativas): agentes {oneTimeAgents + recurringAgents} • armazenamento {oneTimeStorage + recurringStorage}MB • IA {oneTimeAi + recurringAi}
                    </div>
                  );
                })()}
                <div>
                  <p className="text-xs text-muted-foreground">Extra agentes</p>
                  <p className="text-sm font-medium">{Number(currentPlan.addons.extraAgents || 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Extra armazenamento (MB)</p>
                  <p className="text-sm font-medium">{Number(currentPlan.addons.extraStorage || 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Creditos de IA</p>
                  <p className="text-sm font-medium">{Number(currentPlan.addons.aiCredits || 0)}</p>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {addonsOneTime.filter((p) => ['pending', 'overdue'].includes(String(p.status || '').toLowerCase())).length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Pagamentos pendentes (avulso)</p>
              {addonsOneTime
                .filter((p) => ['pending', 'overdue'].includes(String(p.status || '').toLowerCase()))
                .slice(0, 5)
                .map((p) => {
                  const meta = addOnById.get(p.addOnId);
                  const statusRaw = String(p.status || '').toLowerCase();
                  const label = formatOneTimeStatus(statusRaw);
                  const invoice = String(p.invoiceUrl || '').trim();
                  return (
                    <div key={p.paymentId} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{meta?.name || p.addOnId}</p>
                          <Badge variant="secondary" className="bg-transparent border border-border text-foreground">
                            {label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {p.value ? `R$ ${Number(p.value).toFixed(2).replace('.', ',')}` : 'Pagamento avulso'}
                          {p.createdAt ? ` • criado em ${new Date(p.createdAt).toLocaleDateString('pt-BR')}` : ''}
                        </p>
                      </div>
                      {invoice ? (
                        <Button variant="outline" size="sm" onClick={() => window.open(invoice, '_blank')}
                        >
                          Abrir pagamento
                        </Button>
                      ) : null}
                    </div>
                  );
                })}
            </div>
          ) : null}

          {addonsRecurring.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Assinaturas mensais</p>
              {addonsRecurring.map((r) => {
                const meta = addOnById.get(r.addOnId);
                const statusRaw = String(r.status || '').toLowerCase();
                const effective = isRecurringEffective(r);
                const canCancel = statusRaw !== 'canceled';

                const parts: string[] = [];
                if (Number(r.extraAgents || 0)) parts.push(`+${Number(r.extraAgents || 0)} agentes`);
                if (Number(r.extraStorage || 0)) parts.push(`+${Number(r.extraStorage || 0)}MB armazenamento`);
                if (Number(r.aiCredits || 0)) parts.push(`+${Number(r.aiCredits || 0)} IA`);

                return (
                  <div key={r.subscriptionId} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{meta?.name || r.addOnId}</p>
                        <Badge
                          variant="secondary"
                          className={effective ? 'bg-transparent border border-border text-foreground' : 'bg-muted text-muted-foreground'}
                        >
                          {formatRecurringStatus(statusRaw)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {meta ? `R$ ${Number(meta.priceMonthly || 0).toFixed(2).replace('.', ',')}/mês` : 'Assinatura mensal'}
                      </p>
                      {r.currentPeriodEnd ? (
                        <p className="text-xs text-muted-foreground">Ativo até: {new Date(r.currentPeriodEnd).toLocaleDateString('pt-BR')}</p>
                      ) : null}
                      {parts.length > 0 ? (
                        <p className="text-xs text-muted-foreground">{parts.join(' • ')}</p>
                      ) : null}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => cancelAddonSubscription(r.subscriptionId)}
                      disabled={!canCancel}
                    >
                      {canCancel ? 'Cancelar' : 'Cancelado'}
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : null}

          {addonsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando...
            </div>
          ) : addons.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum add-on disponivel</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {addons.map((a) => (
                <Card key={a.id} className="bg-card">
                  <CardHeader>
                    <CardTitle className="text-base">{a.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Unico: R$ {Number(a.priceOneTime || 0).toFixed(2).replace('.', ',')} • Mensal: R$ {Number(a.priceMonthly || 0).toFixed(2).replace('.', ',')}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-2">
                      <Button onClick={() => openAddonCheckout(a.id, 'one_time')} disabled={!addonsCanPurchase}>
                        Comprar novamente (unico)
                      </Button>
                      <Button variant="secondary" onClick={() => openAddonCheckout(a.id, 'monthly')} disabled={!addonsCanPurchase}>
                        Assinar (mensal)
                      </Button>
                    </div>
                    {!addonsCanPurchase ? (
                      <p className="text-xs text-muted-foreground">Ative um plano pago para comprar add-ons.</p>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Planos Disponíveis */}
      <div className="grid gap-6 md:grid-cols-3">
        {availablePlans.length === 0 ? (
          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle>Nenhum plano disponível</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Tente recarregar esta página.</p>
            </CardContent>
          </Card>
        ) : availablePlans.map((plan) => {
          const isCurrentPlan = currentPlan?.plan === plan.id;
          const canChangeInPlace = !!currentPlan && currentPlan.plan !== 'free' && !currentPlan.isTrial;
          const Icon = plan.id === 'free' ? Sparkles : plan.id === 'pro' ? Zap : Building2;
          
          return (
            <Card 
              key={plan.id} 
              className={`relative ${isCurrentPlan ? 'border-primary border-2' : ''}`}
            >
              {isCurrentPlan && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge>Plano Atual</Badge>
                </div>
              )}
              
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${
                    plan.id === 'free' ? 'bg-gray-100' : 
                    plan.id === 'pro' ? 'bg-blue-100' : 'bg-purple-100'
                  }`}>
                    <Icon className={`h-5 w-5 ${
                      plan.id === 'free' ? 'text-gray-600' : 
                      plan.id === 'pro' ? 'text-blue-600' : 'text-purple-600'
                    }`} />
                  </div>
                  <CardTitle>{plan.name}</CardTitle>
                </div>
                <div className="mt-4">
                  <span className="text-4xl font-bold">R$ {plan.price.toFixed(2).replace('.', ',')}</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">
                      {plan.limits.agents === 'Ilimitado' ? 'Agentes ilimitados' : `${plan.limits.agents} agentes`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">
                      {plan.limits.tickets === 'Ilimitado' ? 'Tickets ilimitados' : `${plan.limits.tickets} tickets/mês`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm">{plan.limits.storage} de armazenamento</span>
                  </div>
                </div>

                <div className="space-y-2">
                  {plan.features.map((feature) => (
                    <div key={feature.name} className="flex items-center gap-2">
                      {feature.available ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <X className="h-4 w-4 text-gray-300" />
                      )}
                      <span className={`text-sm ${!feature.available && 'text-muted-foreground'}`}>
                        {feature.label}
                      </span>
                    </div>
                  ))}
                </div>

                <Button 
                  className="w-full"
                  variant={isCurrentPlan ? 'outline' : 'default'}
                  disabled={isCurrentPlan || isProcessing || isChangingPlan}
                  onClick={() => {
                    if (canChangeInPlace) {
                      changePlan(plan.id);
                      return;
                    }
                    openCheckout(plan.id);
                  }}
                  title={canChangeInPlace ? 'Atualiza a assinatura atual. Downgrades podem ser agendados para o proximo ciclo.' : undefined}
                >
                  {isCurrentPlan ? 'Plano Atual' : canChangeInPlace ? 'Trocar para este plano' : 'Escolher Plano'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Portal/Subscription Dialog */}
      <Dialog open={isPortalOpen} onOpenChange={setIsPortalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assinatura</DialogTitle>
            <DialogDescription>Detalhes da sua assinatura atual</DialogDescription>
          </DialogHeader>
          {portalLoading ? (
            <div className="py-6 text-center text-sm text-muted-foreground">Carregando...</div>
          ) : portalData ? (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Plano</span>
                <span className="font-medium">{String(portalData.plan || currentPlan?.plan || '-').toUpperCase()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium">{String(portalData.status || currentPlan?.subscription?.status || '-').toUpperCase()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Periodo ate</span>
                <span className="font-medium">
                  {portalData.currentPeriodEnd
                    ? new Date(portalData.currentPeriodEnd).toLocaleDateString('pt-BR')
                    : '-'}
                </span>
              </div>
              {portalData.subscription?.nextDueDate ? (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Próximo vencimento</span>
                  <span className="font-medium">{String(portalData.subscription.nextDueDate)}</span>
                </div>
              ) : null}
              {portalData.subscription?.value ? (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Valor</span>
                  <span className="font-medium">R$ {Number(portalData.subscription.value).toFixed(2).replace('.', ',')}</span>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Add-on Checkout Dialog */}
      <Dialog open={isAddonCheckoutOpen} onOpenChange={setIsAddonCheckoutOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Checkout do add-on</DialogTitle>
            <DialogDescription>
              {addonMode === 'monthly' ? 'Assinatura mensal do add-on' : 'Compra unica do add-on'}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <RadioGroup
              value={addonBillingType}
              onValueChange={(value) => setAddonBillingType(value as any)}
              className="space-y-3"
            >
              <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-muted transition-colors">
                <RadioGroupItem value="CREDIT_CARD" id="addon-credit" />
                <Label htmlFor="addon-credit" className="flex-1 flex items-center gap-3 cursor-pointer">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="font-medium">Cartao</div>
                    <div className="text-sm text-muted-foreground">Pagamento {addonMode === 'monthly' ? 'recorrente' : 'unico'}</div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-muted transition-colors">
                <RadioGroupItem value="PIX" id="addon-pix" />
                <Label htmlFor="addon-pix" className="flex-1 flex items-center gap-3 cursor-pointer">
                  <QrCode className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="font-medium">PIX</div>
                    <div className="text-sm text-muted-foreground">Aprovacao em segundos</div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-muted transition-colors">
                <RadioGroupItem value="BOLETO" id="addon-boleto" />
                <Label htmlFor="addon-boleto" className="flex-1 flex items-center gap-3 cursor-pointer">
                  <FileText className="h-5 w-5 text-orange-600" />
                  <div>
                    <div className="font-medium">Boleto</div>
                    <div className="text-sm text-muted-foreground">Compensacao em 1-2 dias</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setIsAddonCheckoutOpen(false)} className="flex-1" disabled={isAddonProcessing}>
              Cancelar
            </Button>
            <Button onClick={processAddonCheckout} disabled={isAddonProcessing || !selectedAddon} className="flex-1">
              {isAddonProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                'Continuar'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Checkout Dialog */}
      <Dialog
        open={isCheckoutOpen}
        onOpenChange={(open) => {
          if (isProcessing) return;
          setIsCheckoutOpen(open);
          if (!open) setSelectedPlan(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Escolher Forma de Pagamento</DialogTitle>
            <DialogDescription>
              {selectedPlanObj
                ? `Plano ${selectedPlanObj.name} - R$ ${selectedPlanObj.price.toFixed(2).replace('.', ',')}/mês`
                : 'Selecione um plano para continuar.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <RadioGroup
              value={billingType}
              onValueChange={(value) => setBillingType(value as any)}
              className="space-y-3"
            >
              <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-muted transition-colors">
                <RadioGroupItem value="CREDIT_CARD" id="credit" />
                <Label htmlFor="credit" className="flex-1 flex items-center gap-3 cursor-pointer">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="font-medium">Cartão de Crédito</div>
                    <div className="text-sm text-muted-foreground">Pagamento recorrente automático</div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-muted transition-colors">
                <RadioGroupItem value="PIX" id="pix" />
                <Label htmlFor="pix" className="flex-1 flex items-center gap-3 cursor-pointer">
                  <QrCode className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="font-medium">PIX</div>
                    <div className="text-sm text-muted-foreground">Aprovação em segundos</div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-muted transition-colors">
                <RadioGroupItem value="BOLETO" id="boleto" />
                <Label htmlFor="boleto" className="flex-1 flex items-center gap-3 cursor-pointer">
                  <FileText className="h-5 w-5 text-orange-600" />
                  <div>
                    <div className="font-medium">Boleto Bancário</div>
                    <div className="text-sm text-muted-foreground">Compensação em 1-2 dias úteis</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setIsCheckoutOpen(false)}
              className="flex-1"
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button onClick={processCheckout} disabled={isProcessing || !selectedPlanObj} className="flex-1">
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                'Continuar para Pagamento'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
