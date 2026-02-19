import { Link } from 'react-router-dom';
import { Check, Sparkles, Zap, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 'R$ 0',
    description: 'Para começar com o essencial.',
    features: ['1 agente', 'Até 50 tickets/mês', 'Chat em tickets', 'Satisfação básica'],
    cta: 'Começar grátis',
    href: '/register?plan=free',
    icon: Sparkles,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 'R$ 29,90',
    description: 'Para equipes que precisam de visibilidade e escala.',
    features: ['Até 5 agentes', 'Tickets ilimitados', 'Relatórios avançados', 'Base de conhecimento', 'Controle de tempo'],
    cta: 'Começar trial',
    href: '/register?plan=pro',
    highlight: true,
    icon: Zap,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'R$ 99,90',
    description: 'Para operações com compliance e integrações.',
    features: ['Agentes ilimitados', 'Webhooks', 'API', 'White-label', 'Domínio personalizado'],
    cta: 'Começar trial',
    href: '/register?plan=enterprise',
    icon: Building2,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Planos e preços</h1>
            <p className="mt-3 text-gray-600">14 dias grátis nos planos pagos. Sem cartão para começar.</p>
          </div>
          <Link to="/login">
            <Button variant="outline">Entrar</Button>
          </Link>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {plans.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.id}
                className={`rounded-2xl border bg-white p-6 shadow-sm ${p.highlight ? 'ring-2 ring-primary' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-lg font-semibold">{p.name}</div>
                  </div>
                  {p.highlight ? <Badge variant="secondary">Mais popular</Badge> : null}
                </div>

                <div className="mt-6">
                  <div className="text-4xl font-bold">{p.price}</div>
                  <div className="mt-2 text-sm text-gray-600">{p.description}</div>
                </div>

                <ul className="mt-6 space-y-2 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 text-green-600" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-8">
                  <Link to={p.href}>
                    <Button className="w-full" variant={p.highlight ? 'default' : 'outline'}>
                      {p.cta}
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-10 text-center text-sm text-gray-600">
          Precisa de ajuda para escolher? <Link className="text-primary hover:underline" to="/register">Crie uma conta</Link> e fale com a gente.
        </div>
      </div>
    </div>
  );
}
