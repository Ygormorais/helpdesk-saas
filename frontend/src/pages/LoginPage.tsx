import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { GoogleLoginButton } from '@/components/GoogleLoginButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { usePendingInvites } from '@/hooks/use-pending-invites';

const loginSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(6, 'Senha deve ter no minimo 6 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const googleClientId = String(import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const emailValue = watch('email');
  const { pendingInvites, pendingInvitesLoading } = usePendingInvites(emailValue);

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      await login(data.email, data.password);
      toast({ title: 'Login realizado com sucesso' });
    } catch (error: any) {
      toast({
        title: 'Erro ao fazer login',
        description: error.response?.data?.message || 'Credenciais invalidas',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onGoogleLogin = async (credential: string) => {
    setIsLoading(true);
    try {
      await loginWithGoogle(credential);
      toast({ title: 'Login com Google realizado com sucesso' });
    } catch (error: any) {
      toast({
        title: 'Erro ao entrar com Google',
        description:
          error.response?.data?.message
          || 'Nao foi possivel autenticar sua conta Google agora.',
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
                    Verifique seu email para o link de acesso, incluindo spam e lixo eletronico.
                  </p>
                  <div className="mt-2 space-y-1">
                    {pendingInvites.map((inv) => (
                      <div
                        key={inv._id}
                        className="flex items-center justify-between gap-3 text-xs"
                      >
                        <span className="truncate">{inv.tenant?.name || 'Equipe'}</span>
                        <span className="text-muted-foreground">
                          expira{' '}
                          {inv.expiresAt
                            ? new Date(inv.expiresAt).toLocaleDateString('pt-BR')
                            : '-'}
                        </span>
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
                placeholder="........"
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

          {googleClientId ? (
            <>
              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs uppercase tracking-wide text-muted-foreground">ou</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <GoogleLoginButton onCredential={onGoogleLogin} disabled={isLoading} />

              <p className="mt-3 text-center text-xs text-muted-foreground">
                Use o mesmo email ja provisionado no sistema.
              </p>
            </>
          ) : null}

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Nao tem uma conta? </span>
            <Link to="/register" className="text-primary hover:underline">
              Cadastre-se
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
