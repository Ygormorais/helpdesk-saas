import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<InviteDto[]>([]);
  const [pendingInvitesLoading, setPendingInvitesLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const emailValue = watch('email');
  const normalizedEmail = useMemo(() => String(emailValue || '').trim().toLowerCase(), [emailValue]);

  useEffect(() => {
    const isValid = z.string().email().safeParse(normalizedEmail).success;
    if (!isValid) {
      setPendingInvites([]);
      setPendingInvitesLoading(false);
      return;
    }

    let cancelled = false;
    const t = window.setTimeout(async () => {
      try {
        setPendingInvitesLoading(true);
        const res = await invitesApi.pending(normalizedEmail);
        if (cancelled) return;
        setPendingInvites(res.data.invites || []);
      } catch {
        if (cancelled) return;
        setPendingInvites([]);
      } finally {
        if (!cancelled) setPendingInvitesLoading(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [normalizedEmail]);

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      await login(data.email, data.password);
      toast({ title: 'Login realizado com sucesso' });
    } catch (error: any) {
      toast({
        title: 'Erro ao fazer login',
        description: error.response?.data?.message || 'Credenciais inválidas',
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
          <CardTitle className="text-2xl">Bem-vindo de volta</CardTitle>
          <CardDescription>Entre com sua conta para continuar</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}

              {pendingInvitesLoading ? (
                <p className="text-xs text-muted-foreground">Verificando convites pendentes...</p>
              ) : pendingInvites.length > 0 ? (
                <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                  <p className="font-medium">Convite pendente encontrado</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Verifique seu email para o link de acesso (incluindo spam/lixo eletronico).
                  </p>
                  <div className="mt-2 space-y-1">
                    {pendingInvites.map((inv) => (
                      <div key={inv._id} className="flex items-center justify-between gap-3 text-xs">
                        <span className="truncate">{inv.tenant?.name || 'Equipe'}</span>
                        <span className="text-muted-foreground">expira {inv.expiresAt ? new Date(inv.expiresAt).toLocaleDateString('pt-BR') : '-'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Não tem uma conta? </span>
            <Link to="/register" className="text-primary hover:underline">
              Cadastre-se
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
