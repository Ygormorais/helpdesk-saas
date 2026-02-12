import { useState } from 'react';
import { Play, Pause, Square, Clock, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface TimerProps {
  ticketId?: string;
  ticketNumber?: string;
  ticketTitle?: string;
  variant?: 'default' | 'compact';
  onTimerStart?: () => void;
  onTimerStop?: () => void;
}

export default function Timer({
  ticketId,
  ticketNumber,
  ticketTitle,
  variant = 'default',
  onTimerStart,
  onTimerStop,
}: TimerProps) {
  const { activeTimer, elapsedSeconds, isRunning, startTimer, stopTimer, formatElapsedTime } = useTimeTracking();
  const [manualHours, setManualHours] = useState('');
  const [manualMinutes, setManualMinutes] = useState('');
  const [description, setDescription] = useState('');
  const [showManual, setShowManual] = useState(false);

  const handleStartTimer = async () => {
    if (!ticketId || !ticketNumber || !ticketTitle) return;
    await startTimer(ticketId, ticketNumber, ticketTitle, description);
    onTimerStart?.();
    setDescription('');
  };

  const handleStopTimer = async () => {
    await stopTimer();
    onTimerStop?.();
  };

  const handleManualSubmit = async () => {
    if (!ticketId) return;
    
    const hours = parseInt(manualHours) || 0;
    const minutes = parseInt(manualMinutes) || 0;
    const duration = (hours * 60 + minutes) * 60 * 1000;

    if (duration <= 0) return;

    try {
      const token = localStorage.getItem('token');
      await fetch('/api/time/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ticketId,
          description: description || 'Registro manual',
          duration,
          startTime: new Date(Date.now() - duration).toISOString(),
          endTime: new Date().toISOString(),
        }),
      });

      setManualHours('');
      setManualMinutes('');
      setDescription('');
      setShowManual(false);
      onTimerStart?.();
    } catch (error) {
      console.error('Error adding manual entry:', error);
    }
  };

  const activeForTicket = activeTimer?.ticket._id === ticketId;

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2">
        {isRunning && activeForTicket ? (
          <>
            <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full">
              <Clock className="h-4 w-4 animate-pulse" />
              <span className="font-mono font-medium">{formatElapsedTime()}</span>
            </div>
            <Button size="sm" variant="destructive" onClick={handleStopTimer}>
              <Square className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button size="sm" onClick={handleStartTimer} disabled={!ticketId}>
            <Play className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Cronômetro
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isRunning && activeForTicket ? (
          <div className="text-center">
            <div className="text-4xl font-mono font-bold text-primary">
              {formatElapsedTime()}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Ticket #{activeTimer.ticket.ticketNumber}
            </p>
            {activeTimer.description && (
              <p className="text-sm mt-2">{activeTimer.description}</p>
            )}
            <Button className="mt-4" variant="destructive" onClick={handleStopTimer}>
              <Square className="mr-2 h-4 w-4" />
              Parar Cronômetro
            </Button>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-4xl font-mono font-bold text-muted-foreground">
              00:00:00
            </div>
            <Button className="mt-4" onClick={handleStartTimer} disabled={!ticketId}>
              <Play className="mr-2 h-4 w-4" />
              Iniciar Cronômetro
            </Button>
          </div>
        )}

        <div className="border-t pt-4">
          <Dialog open={showManual} onOpenChange={setShowManual}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Tempo Manual
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Tempo Manual</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Tempo Gasto</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        type="number"
                        placeholder="Horas"
                        value={manualHours}
                        onChange={(e) => setManualHours(e.target.value)}
                        min="0"
                      />
                      <span className="text-xs text-muted-foreground">Horas</span>
                    </div>
                    <div className="flex-1">
                      <Input
                        type="number"
                        placeholder="Minutos"
                        value={manualMinutes}
                        onChange={(e) => setManualMinutes(e.target.value)}
                        min="0"
                        max="59"
                      />
                      <span className="text-xs text-muted-foreground">Minutos</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Descrição (opcional)</Label>
                  <Input
                    placeholder="O que você fez?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => setShowManual(false)} className="flex-1">
                    Cancelar
                  </Button>
                  <Button onClick={handleManualSubmit} className="flex-1">
                    Adicionar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}
