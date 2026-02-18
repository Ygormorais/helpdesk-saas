import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { invitesApi, type InviteDto } from '@/api/invites';
import { usePendingInvites } from '@/hooks/use-pending-invites';

const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  tenantName: z.string().min(2, 'Nome da empresa deve ter no mínimo 2 caracteres'),
});

const registerInviteSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

type RegisterForm = z.infer<typeof registerSchema>;
type RegisterInviteForm = z.infer<typeof registerInviteSchema>;

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  manager: 'Gerente',
  agent: 'Agente',
  client: 'Cliente',
};

export default function RegisterPage() {
  const { register: registerUser, registerInvite } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [invite, setInvite] = useState<InviteDto | null>(null);

  const inviteToken = useMemo(() => {
    const raw = searchParams.get('token');
    return raw ? String(raw) : null;
  }, [searchParams]);

  const selectedPlan = useMemo(() => {
    const raw = String(searchParams.get('plan') || '').trim().toLowerCase();
    if (!raw) return null;
    if (raw === 'free' || raw === 'pro' || raw === 'enterprise') return raw;
    return null;
  }, [searchParams]);

  const isInviteMode = !!inviteToken;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(isInviteMode ? registerInviteSchema : registerSchema),
  });

  const emailValue = watch('email');
  const { pendingInvites, pendingInvitesLoading } = usePendingInvites(emailValue, {
    enabled: !inviteToken,
  });

  useEffect(() => {
    if (!inviteToken) return;
    let cancelled = false;
    setInviteLoading(true);
    setInviteError(null);
    invitesApi
      .accept(inviteToken)
      .then((res) => {
        if (cancelled) return;
        if (!res.data?.valid) {
          setInviteError('Convite inválido');
          return;
        }
        setInvite(res.data.invite);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setInviteError(err?.response?.data?.message || 'Convite inválido');
      })
      .finally(() => {
        if (cancelled) return;
        setInviteLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [inviteToken]);

  // pending invites handled via usePendingInvites hook

  const onSubmit = async (data: RegisterForm | RegisterInviteForm) => {
    setIsLoading(true);
    try {
      if (inviteToken) {
        const payload = data as RegisterInviteForm;
        await registerInvite({ token: inviteToken, name: payload.name, password: payload.password });
        toast({ title: 'Conta criada com sucesso' });
      } else {
        await registerUser(data as RegisterForm);
        toast({ title: 'Conta criada com sucesso' });
        if (selectedPlan && selectedPlan !== 'free') {
          navigate(`/plans?checkout=${encodeURIComponent(selectedPlan)}`);
        }
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao criar conta',
        description: error.response?.data?.message || 'Tente novamente',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{inviteToken ? 'Aceitar convite' : 'Criar sua conta'}</CardTitle>
          <CardDescription>
            {inviteToken
              ? 'Complete seu cadastro para entrar na equipe'
              : 'Comece a usar o HelpDesk hoje mesmo'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {inviteToken && inviteLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Validando convite...</div>
          ) : inviteToken && inviteError ? (
            <div className="py-8 text-center">
              <p className="text-sm text-destructive">{inviteError}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Verifique se o link esta correto ou solicite um novo convite.
              </p>
              <div className="mt-6">
                <Link to="/login" className="text-sm text-primary hover:underline">
                  Ir para login
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Seu nome</Label>
              <Input
                id="name"
                placeholder="João Silva"
                {...register('name')}
              />
              {errors.name?.message ? (
                <p className="text-sm text-destructive">{String(errors.name.message)}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              {inviteToken ? (
                <Input id="email" type="email" value={invite?.email || searchParams.get('email') || ''} disabled />
              ) : (
                <>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    {...register('email')}
                  />
                  {errors.email?.message ? (
                    <p className="text-sm text-destructive">{String(errors.email.message)}</p>
                  ) : null}

                  {pendingInvitesLoading ? (
                    <p className="text-xs text-muted-foreground">Verificando convites pendentes...</p>
                  ) : pendingInvites.length > 0 ? (
                    <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                      <p className="font-medium">Seu email tem convite pendente</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Para entrar na equipe, use o link enviado por email (incluindo spam/lixo eletronico).
                      </p>
                      <div className="mt-2 space-y-1">
                        {pendingInvites.map((inv) => (
                          <div key={inv._id} className="flex items-center justify-between gap-3 text-xs">
                            <span className="truncate">{inv.tenant?.name || 'Equipe'}</span>
                            <span className="text-muted-foreground">
                              expira {inv.expiresAt ? new Date(inv.expiresAt).toLocaleDateString('pt-BR') : '-'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
              />
              {errors.password?.message ? (
                <p className="text-sm text-destructive">{String(errors.password.message)}</p>
              ) : null}
            </div>

            {inviteToken ? (
                      <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">Equipe</span>
                          <span className="font-medium">{invite?.tenant?.name || '---'}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">Função</span>
                          <span className="font-medium">{roleLabels[String(invite?.role || '')] || String(invite?.role || '---')}</span>
                        </div>
                      </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="tenantName">Nome da empresa</Label>
                <Input id="tenantName" placeholder="Minha Empresa" {...register('tenantName')} />
                {errors.tenantName?.message ? (
                  <p className="text-sm text-destructive">{String(errors.tenantName.message)}</p>
                ) : null}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading || (inviteToken ? inviteLoading || !!inviteError || !invite : false)}>
              {isLoading ? 'Criando conta...' : inviteToken ? 'Entrar na equipe' : 'Criar conta'}
            </Button>
            </form>
          )}

          {!inviteToken ? (
            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Já tem uma conta? </span>
              <Link to="/login" className="text-primary hover:underline">
                Entrar
              </Link>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
