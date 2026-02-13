import { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SatisfactionSurveyProps {
  ticketNumber: string;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => Promise<void>;
}

export default function SatisfactionSurvey({
  ticketNumber,
  onClose,
  onSubmit,
}: SatisfactionSurveyProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hoveredRating, setHoveredRating] = useState(0);

  const labels: Record<number, string> = {
    1: 'Muito Insatisfeito',
    2: 'Insatisfeito',
    3: 'Neutro',
    4: 'Satisfeito',
    5: 'Muito Satisfeito',
  };

  const emojis = {
    1: '😠',
    2: '😕',
    3: '😐',
    4: '🙂',
    5: '🤩',
  };

  const handleSubmit = async () => {
    if (rating === 0) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(rating, comment);
      onClose();
    } catch (error) {
      console.error('Error submitting survey:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            Avalie seu atendimento
          </DialogTitle>
          <DialogDescription className="text-center">
            Ticket #{ticketNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Como você avalia a resolução do seu ticket?
            </p>

            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110 focus:outline-none"
                >
                  <Star
                    className={`h-10 w-10 ${
                      star <= (hoveredRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>

            {rating > 0 && (
              <div className="mt-2">
                <span className="text-lg">
                  {emojis[rating as keyof typeof emojis]}
                </span>
                <p className="text-sm font-medium text-primary">
                  {labels[rating as keyof typeof labels]}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Comentário (opcional)
            </label>
            <Textarea
              placeholder="Conte-nos mais sobre sua experiência..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Pular
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={rating === 0 || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Enviando...' : 'Enviar Avaliação'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface SatisfactionBadgeProps {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
}

export function SatisfactionBadge({ rating, size = 'md' }: SatisfactionBadgeProps) {
  const colors: Record<number, string> = {
    1: 'bg-red-100 text-red-800',
    2: 'bg-orange-100 text-orange-800',
    3: 'bg-yellow-100 text-yellow-800',
    4: 'bg-blue-100 text-blue-800',
    5: 'bg-green-100 text-green-800',
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const emojis: Record<number, string> = {
    1: '😠',
    2: '😕',
    3: '😐',
    4: '🙂',
    5: '🤩',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${colors[rating]} ${sizeClasses[size]}`}
    >
      <span>{emojis[rating]}</span>
      <span>{rating}/5</span>
    </span>
  );
}

interface SatisfactionCardProps {
  average: number;
  total: number;
  nps?: number;
}

export function SatisfactionCard({ average, total, nps }: SatisfactionCardProps) {
  const stars = Math.round(average);

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Avaliação Média</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-3xl font-bold">{average.toFixed(1)}</span>
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-5 w-5 ${
                      star <= stars
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {total} avaliações
            </p>
          </div>

          {nps !== undefined && (
            <div className="text-center">
              <div
                className={`text-3xl font-bold ${
                  nps >= 50 ? 'text-green-600' : nps >= 0 ? 'text-yellow-600' : 'text-red-600'
                }`}
              >
                {nps}
              </div>
              <p className="text-xs text-muted-foreground">NPS</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface SatisfactionInputProps {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
}

export function SatisfactionInput({
  value,
  onChange,
  disabled = false,
}: SatisfactionInputProps) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          disabled={disabled}
          className="focus:outline-none transition-opacity"
        >
          <Star
            className={`h-6 w-6 ${
              star <= value
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            } ${disabled ? 'opacity-50' : ''}`}
          />
        </button>
      ))}
    </div>
  );
}
