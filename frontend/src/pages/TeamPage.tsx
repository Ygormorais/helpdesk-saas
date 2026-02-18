import { useMemo, useState } from 'react';
import { Mail, RefreshCw, UserPlus, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usersApi } from '@/api/users';
import { invitesApi, type InviteDto } from '@/api/invites';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const roles = [
  { value: 'admin', label: 'Administrador', desc: 'Acesso completo ao sistema' },
  { value: 'manager', label: 'Gerente', desc: 'Gerencia equipe e relatórios' },
  { value: 'agent', label: 'Agente', desc: 'Atende tickets' },
  { value: 'client', label: 'Cliente', desc: 'Acesso limitado' },
];

const getInitials = (name: string) =>
  String(name || '')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

const getRoleBadge = (role: string) => {
  const styles: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-800',
    manager: 'bg-blue-100 text-blue-800',
    agent: 'bg-green-100 text-green-800',
    client: 'bg-gray-100 text-gray-800',
  };
  const labels: Record<string, string> = {
    admin: 'Administrador',
    manager: 'Gerente',
    agent: 'Agente',
    client: 'Cliente',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[role]}`}>
      {labels[role]}
    </span>
  );
};

export default function TeamPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newInvite, setNewInvite] = useState({ email: '', role: 'agent' as string });
  const [resendingInviteId, setResendingInviteId] = useState<string | null>(null);

  const canManageInvites = user?.role === 'admin' || user?.role === 'manager';

  const membersQuery = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const res = await usersApi.listStaff();
      return res.data.users;
    },
  });

  const invitesQuery = useQuery({
    queryKey: ['invites'],
    enabled: canManageInvites,
    queryFn: async () => {
      const res = await invitesApi.list();
      return (res.data.invites || []) as InviteDto[];
    },
  });

  const pendingInvites = useMemo(
    () => (invitesQuery.data || []).filter((i) => i.status === 'pending'),
    [invitesQuery.data]
  );

  const createInviteMutation = useMutation({
    mutationFn: async () => {
      const email = newInvite.email.trim().toLowerCase();
      const role = newInvite.role as InviteDto['role'];
      if (!email) throw new Error('email');
      return invitesApi.create({ email, role });
    },
    onSuccess: () => {
      toast({ title: 'Convite enviado' });
      setNewInvite({ email: '', role: 'agent' });
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['invites'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao enviar convite',
        description: error?.response?.data?.message || 'Tente novamente',
        variant: 'destructive',
      });
    },
  });

  const cancelInviteMutation = useMutation({
    mutationFn: async (id: string) => invitesApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invites'] });
      toast({ title: 'Convite cancelado' });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao cancelar convite',
        description: error?.response?.data?.message || 'Tente novamente',
        variant: 'destructive',
      });
    },
  });

  const resendInviteMutation = useMutation({
    mutationFn: async (id: string) => invitesApi.resend(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invites'] });
      toast({ title: 'Convite reenviado' });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao reenviar convite',
        description: error?.response?.data?.message || 'Tente novamente',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setResendingInviteId(null);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Equipe</h1>
          <p className="text-muted-foreground">Gerencie membros e convites</p>
        </div>
        {canManageInvites ? (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Convidar Membro
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Convidar Novo Membro</DialogTitle>
                <DialogDescription>
                  Envie um convite para adicionar alguém à sua equipe.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="pessoa@empresa.com"
                    value={newInvite.email}
                    onChange={(e) => setNewInvite({ ...newInvite, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Função</Label>
                  <Select
                    value={newInvite.role}
                    onValueChange={(value) => setNewInvite({ ...newInvite, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => createInviteMutation.mutate()}
                  disabled={createInviteMutation.isPending || !newInvite.email.trim()}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  {createInviteMutation.isPending ? 'Enviando...' : 'Enviar Convite'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Membros da Equipe</CardTitle>
            <CardDescription>Pessoas que já fazem parte da sua equipe</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {membersQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Carregando membros...</p>
              ) : membersQuery.isError ? (
                <p className="text-sm text-destructive">Erro ao carregar membros</p>
              ) : (membersQuery.data || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum membro encontrado</p>
              ) : (
                (membersQuery.data || []).map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-sm font-medium text-primary">
                          {getInitials(member.name)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{member.name}</p>
                        <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {getRoleBadge(member.role)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {canManageInvites ? (
          <Card>
            <CardHeader>
              <CardTitle>Convites Pendentes</CardTitle>
              <CardDescription>Convites enviados aguardando resposta</CardDescription>
            </CardHeader>
            <CardContent>
              {invitesQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Carregando convites...</p>
              ) : invitesQuery.isError ? (
                <p className="text-sm text-destructive">Erro ao carregar convites</p>
              ) : pendingInvites.length > 0 ? (
                <div className="space-y-4">
                  {pendingInvites.map((invite) => (
                    <div key={invite._id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <Mail className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{invite.email}</p>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            <span>
                              Enviado: {invite.createdAt ? new Date(invite.createdAt).toLocaleString('pt-BR') : '-'}
                            </span>
                            <span>•</span>
                            <span>
                              Expira: {invite.expiresAt ? new Date(invite.expiresAt).toLocaleString('pt-BR') : '-'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getRoleBadge(invite.role)}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setResendingInviteId(invite._id);
                            resendInviteMutation.mutate(invite._id);
                          }}
                          disabled={resendInviteMutation.isPending && resendingInviteId === invite._id}
                          title="Reenviar convite"
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          {resendInviteMutation.isPending && resendingInviteId === invite._id ? 'Reenviando...' : 'Reenviar'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => cancelInviteMutation.mutate(invite._id)}
                          disabled={cancelInviteMutation.isPending}
                          title="Cancelar convite"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Nenhum convite pendente</p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
