import { useState } from 'react';
import { Plus, Mail, UserPlus, Clock, Check, X } from 'lucide-react';
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

const roles = [
  { value: 'admin', label: 'Administrador', desc: 'Acesso completo ao sistema' },
  { value: 'manager', label: 'Gerente', desc: 'Gerencia equipe e relatórios' },
  { value: 'agent', label: 'Agente', desc: 'Atende tickets' },
  { value: 'client', label: 'Cliente', desc: 'Acesso limitado' },
];

const mockInvites = [
  { id: '1', email: 'joao@empresa.com', role: 'agent', status: 'pending', sentAt: '2024-01-15 10:00', expiresAt: '2024-01-17 10:00' },
  { id: '2', email: 'maria@empresa.com', role: 'manager', status: 'pending', sentAt: '2024-01-14 15:00', expiresAt: '2024-01-16 15:00' },
  { id: '3', email: 'pedro@empresa.com', role: 'agent', status: 'accepted', sentAt: '2024-01-10 09:00', acceptedAt: '2024-01-10 09:30' },
];

const mockTeamMembers = [
  { id: '1', name: 'Admin Sistema', email: 'admin@empresa.com', role: 'admin', avatar: 'A', lastActive: '2024-01-15 10:30' },
  { id: '2', name: 'Carlos Tech', email: 'carlos@empresa.com', role: 'agent', avatar: 'C', lastActive: '2024-01-15 10:25' },
  { id: '3', name: 'Ana Silva', email: 'ana@empresa.com', role: 'agent', avatar: 'A', lastActive: '2024-01-15 09:45' },
];

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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newInvite, setNewInvite] = useState({ email: '', role: 'agent' as string });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Equipe</h1>
          <p className="text-muted-foreground">Gerencie membros e convites</p>
        </div>
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
              <Button onClick={() => setIsDialogOpen(false)}>
                <Mail className="mr-2 h-4 w-4" />
                Enviar Convite
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Membros da Equipe</CardTitle>
            <CardDescription>Pessoas que já fazem parte da sua equipe</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockTeamMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">{member.avatar}</span>
                    </div>
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {getRoleBadge(member.role)}
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Último acesso: {member.lastActive}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Convites Pendentes</CardTitle>
            <CardDescription>Convites enviados aguardando resposta</CardDescription>
          </CardHeader>
          <CardContent>
            {mockInvites.filter((i) => i.status === 'pending').length > 0 ? (
              <div className="space-y-4">
                {mockInvites.filter((i) => i.status === 'pending').map((invite) => (
                  <div key={invite.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{invite.email}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>Enviado: {invite.sentAt}</span>
                          <span>•</span>
                          <span>Expira: {invite.expiresAt}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getRoleBadge(invite.role)}
                      <Button variant="ghost" size="icon" className="text-destructive">
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
      </div>
    </div>
  );
}
