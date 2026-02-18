import { useMemo, useState, useEffect } from 'react';
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
  };
  features: {
    name: string;
    available: boolean;
    label: string;
  }[];
}

interface CurrentPlan {
  plan: string;
  isTrial: boolean;
  trialDaysLeft: number;
  limits: {
    agents: { current: number; max: number };
    tickets: { current: number; max: number };
    storage: { current: number; max: number };
  };
  features: Record<string, boolean>;
}

export default function PlansPage() {
  const [currentPlan, setCurrentPlan] = useState<CurrentPlan | null>(null);
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [billingType, setBillingType] = useState<'CREDIT_CARD' | 'BOLETO' | 'PIX'>('CREDIT_CARD');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const selectedPlanObj = useMemo(
    () => (selectedPlan ? availablePlans.find((p) => p.id === selectedPlan) : undefined),
    [availablePlans, selectedPlan]
  );

  useEffect(() => {
    fetchPlanDetails();
  }, []);

  const fetchPlanDetails = async () => {
    try {
      setLoadError(null);
      setLoading(true);

      const res = await api.get('/plan');
      const data = res.data;

      setCurrentPlan(data || null);
      setAvailablePlans(Array.isArray(data?.availablePlans) ? data.availablePlans : []);
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
      toast({
        title: 'Erro',
        description: 'Não foi possível iniciar o checkout',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getUsagePercentage = (current: number, max: number) => {
    if (max === -1) return 0;
    return Math.round((current / max) * 100);
  };

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
        {currentPlan?.isTrial && (
          <Badge variant="secondary" className="text-lg px-4 py-2">
            <Sparkles className="mr-2 h-4 w-4" />
            Trial: {currentPlan.trialDaysLeft} dias restantes
          </Badge>
        )}
      </div>

      {/* Uso Atual */}
      {currentPlan && (
        <Card>
          <CardHeader>
            <CardTitle>Seu Plano Atual: {currentPlan.plan.toUpperCase()}</CardTitle>
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
                  <span>Storage</span>
                  <span className="text-muted-foreground">
                    {Math.round(currentPlan.limits.storage.current / 1024)}MB / {currentPlan.limits.storage.max === -1 ? '∞' : currentPlan.limits.storage.max}MB
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
                    <span className="text-sm">{plan.limits.storage} de storage</span>
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
                  disabled={isCurrentPlan}
                  onClick={() => openCheckout(plan.id)}
                >
                  {isCurrentPlan ? 'Plano Atual' : 'Escolher Plano'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

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
