import { useState } from 'react';
import { Save, Mail, Clock, Bell, Shield, Globe, Server, Copy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBackendHealth } from '@/hooks/useBackendHealth';
import { api } from '@/config/api';
import { toast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    companyName: 'Minha Empresa',
    domain: 'minhaempresa.helpdesk.com',
    email: 'suporte@minhaempresa.com',
    timezone: 'America/Sao_Paulo',
    slaResponseTime: 4,
    slaResolutionTime: 24,
    workingHoursStart: '09:00',
    workingHoursEnd: '18:00',
    emailNotifications: true,
    slackNotifications: false,
    autoAssign: true,
  });

  const health = useBackendHealth();
  const apiBaseUrl = String(api.defaults.baseURL || '').trim();

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: 'Copiado', description: value });
    } catch {
      toast({ title: 'Nao foi possivel copiar', description: 'Copie manualmente: ' + value, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Configurações</h1>
          <p className="text-muted-foreground">Gerencie as configurações da sua empresa</p>
        </div>
        <Button>
          <Save className="mr-2 h-4 w-4" />
          Salvar Alterações
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">
            <Globe className="mr-2 h-4 w-4" />
            Geral
          </TabsTrigger>
          <TabsTrigger value="sla">
            <Clock className="mr-2 h-4 w-4" />
            SLA
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="mr-2 h-4 w-4" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="mr-2 h-4 w-4" />
            Segurança
          </TabsTrigger>
          <TabsTrigger value="diagnostics">
            <Server className="mr-2 h-4 w-4" />
            Diagnóstico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Informações da Empresa</CardTitle>
              <CardDescription>Informações básicas da sua empresa</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Nome da Empresa</Label>
                  <Input
                    id="companyName"
                    value={settings.companyName}
                    onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="domain">Domínio</Label>
                  <Input
                    id="domain"
                    value={settings.domain}
                    onChange={(e) => setSettings({ ...settings, domain: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email de Contato</Label>
                  <Input
                    id="email"
                    type="email"
                    value={settings.email}
                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Fuso Horário</Label>
                  <Select
                    value={settings.timezone}
                    onValueChange={(value) => setSettings({ ...settings, timezone: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/Sao_Paulo">Brasília (GMT-3)</SelectItem>
                      <SelectItem value="America/New_York">Nova York (GMT-5)</SelectItem>
                      <SelectItem value="Europe/London">Londres (GMT+0)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sla">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de SLA</CardTitle>
              <CardDescription>Defina os tempos de resposta e resolução esperados</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="slaResponseTime">Tempo de Resposta (horas)</Label>
                  <Input
                    id="slaResponseTime"
                    type="number"
                    value={settings.slaResponseTime}
                    onChange={(e) => setSettings({ ...settings, slaResponseTime: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slaResolutionTime">Tempo de Resolução (horas)</Label>
                  <Input
                    id="slaResolutionTime"
                    type="number"
                    value={settings.slaResolutionTime}
                    onChange={(e) => setSettings({ ...settings, slaResolutionTime: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workingHoursStart">Início do Expediente</Label>
                  <Input
                    id="workingHoursStart"
                    type="time"
                    value={settings.workingHoursStart}
                    onChange={(e) => setSettings({ ...settings, workingHoursStart: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workingHoursEnd">Fim do Expediente</Label>
                  <Input
                    id="workingHoursEnd"
                    type="time"
                    value={settings.workingHoursEnd}
                    onChange={(e) => setSettings({ ...settings, workingHoursEnd: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Preferências de Notificação</CardTitle>
              <CardDescription>Configure como e quando receber notificações</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'emailNotifications', icon: Mail, title: 'Notificações por Email', desc: 'Receba atualizações por email' },
                { key: 'slackNotifications', icon: Bell, title: 'Notificações Slack', desc: 'Receba alertas no Slack' },
                { key: 'autoAssign', icon: Shield, title: 'Atribuição Automática', desc: 'Atribuir tickets automaticamente' },
              ].map(({ key, icon: Icon, title, desc }) => (
                <label key={key} className="flex items-center justify-between p-4 border rounded-lg cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{title}</p>
                      <p className="text-sm text-muted-foreground">{desc}</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={(settings as any)[key]}
                    onChange={(e) => setSettings({ ...settings, [key]: e.target.checked })}
                    className="h-4 w-4 rounded"
                  />
                </label>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Segurança</CardTitle>
              <CardDescription>Configurações de segurança da conta</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Política de Senha</Label>
                <Textarea
                  value="Mínimo 8 caracteres, 1 letra maiúscula, 1 número, 1 caractere especial"
                  readOnly
                  className="bg-muted"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">Timeout de Sessão (minutos)</Label>
                  <Input id="sessionTimeout" type="number" defaultValue="60" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxLoginAttempts">Tentativas Máximas</Label>
                  <Input id="maxLoginAttempts" type="number" defaultValue="5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diagnostics">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Ambiente</CardTitle>
                <CardDescription>Valores uteis para debugar integracoes e rede</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">API baseURL</p>
                    <p className="text-sm text-muted-foreground break-all">{apiBaseUrl || '(vazio)'}</p>
                  </div>
                  <Button variant="outline" onClick={() => copy(apiBaseUrl || '')} disabled={!apiBaseUrl}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">VITE_API_URL</p>
                    <p className="text-sm break-all">{String(import.meta.env.VITE_API_URL || '') || '-'}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">VITE_BACKEND_URL</p>
                    <p className="text-sm break-all">{String((import.meta.env as any).VITE_BACKEND_URL || '') || '-'}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">VITE_SOCKET_URL</p>
                    <p className="text-sm break-all">{String(import.meta.env.VITE_SOCKET_URL || '') || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Backend</CardTitle>
                <CardDescription>Status do /health e dependencias (Mongo/Redis)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm">
                    Status:{' '}
                    <span className="font-medium">
                      {health.isLoading ? 'carregando...' : health.data?.data?.status || (health.isError ? 'erro' : '-')}
                    </span>
                  </p>
                  <Button variant="outline" onClick={() => health.refetch()}>
                    Atualizar
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">ready</p>
                    <p className="text-sm font-medium">{String(health.data?.data?.ready ?? '-')}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">mongo</p>
                    <p className="text-sm font-medium">
                      {health.data?.data?.deps?.mongo
                        ? (health.data.data.deps.mongo.connected && health.data.data.deps.mongo.ping ? 'ok' : 'problema')
                        : '-'}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">redis</p>
                    <p className="text-sm font-medium">
                      {health.data?.data?.deps?.redis
                        ? (health.data.data.deps.redis.configured ? (health.data.data.deps.redis.ok === false ? 'problema' : 'ok') : 'nao configurado')
                        : '-'}
                    </p>
                  </div>
                </div>

                {health.isError ? (
                  <p className="text-sm text-muted-foreground">
                    Nao foi possivel consultar o health. Verifique se o backend esta rodando e o `VITE_API_URL` esta correto.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
