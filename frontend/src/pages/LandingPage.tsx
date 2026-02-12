import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Check, ArrowRight, Zap, Shield, Users, Clock, BarChart3, MessageSquare, 
  Star, Menu, X, ChevronDown, Play, Sparkles, HeadphonesIcon, FileText,
  TrendingUp, Lock, Globe, Smartphone, CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ClientCarousel from '@/components/sections/ClientCarousel';

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <HeadphonesIcon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">DeskFlow</span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <button onClick={() => scrollToSection('features')} className="text-sm font-medium text-gray-600 hover:text-gray-900">
                Funcionalidades
              </button>
              <button onClick={() => scrollToSection('pricing')} className="text-sm font-medium text-gray-600 hover:text-gray-900">
                Preços
              </button>
              <button onClick={() => scrollToSection('faq')} className="text-sm font-medium text-gray-600 hover:text-gray-900">
                FAQ
              </button>
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-4">
              <Link to="/login">
                <Button variant="ghost">Entrar</Button>
              </Link>
              <Link to="/register">
                <Button>Começar Grátis</Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t">
              <div className="flex flex-col gap-4">
                <button onClick={() => scrollToSection('features')} className="text-left py-2 font-medium">
                  Funcionalidades
                </button>
                <button onClick={() => scrollToSection('pricing')} className="text-left py-2 font-medium">
                  Preços
                </button>
                <button onClick={() => scrollToSection('faq')} className="text-left py-2 font-medium">
                  FAQ
                </button>
                <hr />
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full">Entrar</Button>
                </Link>
                <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full">Começar Grátis</Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 opacity-70" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm">
              <Sparkles className="w-4 h-4 mr-2" />
              14 dias grátis • Sem cartão de crédito
            </Badge>
            
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight mb-6">
              O suporte que seus{' '}
              <span className="text-primary">clientes merecem</span>
            </h1>
            
            <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              DeskFlow é a plataforma completa de atendimento ao cliente. 
              Organize tickets, converse em tempo real e encante seus clientes.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link to="/register">
                <Button size="lg" className="w-full sm:w-auto px-8 py-6 text-lg">
                  Começar Grátis
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="w-full sm:w-auto px-8 py-6 text-lg">
                <Play className="mr-2 w-5 h-5" />
                Ver Demo
              </Button>
            </div>

            {/* Cliente Carousel – animado e centralizado */}
            <ClientCarousel />

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto pt-8 border-t">
              <div>
                <div className="text-3xl font-bold text-primary">500+</div>
                <div className="text-sm text-gray-600">Empresas</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary">99.9%</div>
                <div className="text-sm text-gray-600">Uptime</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary">4.9/5</div>
                <div className="text-sm text-gray-600">Avaliação</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Tudo que você precisa em um só lugar
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Ferramentas poderosas para gerenciar seu atendimento de forma eficiente
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: MessageSquare,
                title: 'Chat em Tempo Real',
                description: 'Converse com seus clientes instantaneamente, diretamente na plataforma.',
              },
              {
                icon: Clock,
                title: 'Controle de Tempo',
                description: 'Monitore o tempo gasto em cada ticket e otimize sua equipe.',
              },
              {
                icon: BarChart3,
                title: 'Relatórios Avançados',
                description: 'Dashboards completos com métricas de satisfação e performance.',
              },
              {
                icon: FileText,
                title: 'Base de Conhecimento',
                description: 'Crie artigos e FAQs para ajudar clientes a se autoatenderem.',
              },
              {
                icon: Shield,
                title: 'SLA Automático',
                description: 'Configure tempos de resposta e resolução automáticos.',
              },
              {
                icon: Globe,
                title: 'Multi-tenant',
                description: 'Cada empresa tem seus dados isolados e seguros.',
              },
            ].map((feature, index) => (
              <div key={index} className="bg-white p-6 rounded-2xl shadow-sm border hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Loved by teams everywhere</h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "O DeskFlow transformou nosso atendimento. Conseguimos reduzir o tempo de resposta em 60%.",
                author: "Ana Silva",
                role: "CEO, TechStart",
              },
              {
                quote: "A melhor ferramenta de help desk que já usamos. Interface limpa e muito fácil de usar.",
                author: "Carlos Mendes",
                role: "Head de Suporte, GrowthCo",
              },
              {
                quote: "A integração com PIX foi um diferencial enorme para nossos clientes brasileiros.",
                author: "Maria Santos",
                role: "Diretora de Operações, BrasilDigital",
              },
            ].map((testimonial, index) => (
              <div key={index} className="bg-gray-50 p-8 rounded-2xl">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 italic">"{testimonial.quote}"</p>
                <div>
                  <div className="font-semibold">{testimonial.author}</div>
                  <div className="text-sm text-gray-600">{testimonial.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Preços simples e transparentes
            </h2>
            <p className="text-lg text-gray-600">
              Comece grátis e evolua conforme sua empresa cresce
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                name: 'Free',
                price: 'R$ 0',
                description: 'Perfeito para começar',
                features: ['1 agente', '50 tickets/mês', 'Chat básico', '14 dias de trial'],
                cta: 'Começar Grátis',
                popular: false,
              },
              {
                name: 'Pro',
                price: 'R$ 29,90',
                description: 'Para times em crescimento',
                features: ['5 agentes', 'Tickets ilimitados', 'Chat + Base de conhecimento', 'Relatórios avançados', 'Suporte prioritário'],
                cta: 'Começar Trial',
                popular: true,
              },
              {
                name: 'Enterprise',
                price: 'R$ 99,90',
                description: 'Para grandes operações',
                features: ['Agentes ilimitados', 'Tudo do Pro', 'API completa', 'Webhooks', 'White-label', 'Suporte 24/7'],
                cta: 'Falar com Vendas',
                popular: false,
              },
            ].map((plan, index) => (
              <div key={index} className={`relative bg-white rounded-2xl p-8 ${
                plan.popular ? 'ring-2 ring-primary shadow-xl' : 'border shadow-sm'
              }`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="px-4 py-1">Mais Popular</Badge>
                  </div>
                )}
                
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                  <div className="text-4xl font-bold mb-2">{plan.price}</div>
                  <div className="text-sm text-gray-600">/mês</div>
                  <p className="text-sm text-gray-600 mt-2">{plan.description}</p>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link to="/register">
                  <Button 
                    className="w-full" 
                    variant={plan.popular ? 'default' : 'outline'}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-gray-600 mt-8">
            Todos os planos incluem SSL, backups diários e suporte por email.
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Perguntas Frequentes</h2>
            <p className="text-gray-600">Tudo que você precisa saber sobre o DeskFlow</p>
          </div>

          <div className="space-y-4">
            {[
              {
                question: 'Posso testar antes de pagar?',
                answer: 'Sim! Oferecemos 14 dias de trial em todos os planos pagos. Não precisa de cartão de crédito para começar.',
              },
              {
                question: 'Como funciona o plano Free?',
                answer: 'O plano Free é gratuito para sempre e inclui 1 agente e até 50 tickets por mês. É perfeito para freelancers e pequenas empresas.',
              },
              {
                question: 'Posso mudar de plano a qualquer momento?',
                answer: 'Sim! Você pode fazer upgrade ou downgrade do seu plano a qualquer momento. A mudança entra em vigor imediatamente.',
              },
              {
                question: 'Quais formas de pagamento vocês aceitam?',
                answer: 'Aceitamos cartão de crédito, boleto bancário e PIX. Todos os pagamentos são processados de forma segura pelo Asaas.',
              },
              {
                question: 'Meus dados estão seguros?',
                answer: 'Absolutamente! Usamos criptografia SSL, backups diários e cada cliente tem seus dados isolados (multi-tenancy).',
              },
            ].map((faq, index) => (
              <div key={index} className="border rounded-lg p-6">
                <h3 className="font-semibold text-lg mb-2">{faq.question}</h3>
                <p className="text-gray-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Pronto para transformar seu atendimento?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Junte-se a mais de 500 empresas que já usam o DeskFlow
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto px-8">
                Começar Grátis
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
          <p className="text-white/70 mt-4 text-sm">
            14 dias grátis • Sem compromisso • Cancelamento fácil
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <HeadphonesIcon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">DeskFlow</span>
              </div>
              <p className="text-gray-400 text-sm">
                A plataforma completa de atendimento ao cliente para empresas brasileiras.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Produto</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><button onClick={() => scrollToSection('features')} className="hover:text-white">Funcionalidades</button></li>
                <li><button onClick={() => scrollToSection('pricing')} className="hover:text-white">Preços</button></li>
                <li><Link to="/login" className="hover:text-white">Login</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Empresa</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">Sobre</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Carreiras</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Suporte</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">Documentação</a></li>
                <li><a href="#" className="hover:text-white">FAQ</a></li>
                <li><a href="#" className="hover:text-white">Contato</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm">
              © 2024 DeskFlow. Todos os direitos reservados.
            </p>
            <div className="flex gap-6 text-sm text-gray-400">
              <a href="#" className="hover:text-white">Termos</a>
              <a href="#" className="hover:text-white">Privacidade</a>
              <a href="#" className="hover:text-white">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
