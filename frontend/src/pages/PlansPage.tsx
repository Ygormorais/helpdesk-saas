import { useState, useEffect } from 'react';
import { Check, X, Sparkles, Zap, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

  useEffect(() => {
    fetchPlanDetails();
  }, []);

  const fetchPlanDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/plan', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setCurrentPlan(data);
      setAvailablePlans(data.availablePlans);
    } catch (error) {
      console.error('Error fetching plan:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os detalhes do plano',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/plan/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan: planId }),
      });
      
      const data = await response.json();
      
      if (data.checkoutUrl) {
        // Redireciona para Stripe checkout
        window.location.href = data.checkoutUrl;
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível iniciar o upgrade',
        variant: 'destructive',
      });
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
        {availablePlans.map((plan) => {
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
                  <span className="text-4xl font-bold">
                    ${plan.price}
                  </span>
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
                  onClick={() => handleUpgrade(plan.id)}
                >
                  {isCurrentPlan ? 'Plano Atual' : 'Escolher Plano'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
