import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export function FeatureUnavailable({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const { user } = useAuth();
  const canManagePlans = user?.role === 'admin' || user?.role === 'manager';

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{description}</p>
        {canManagePlans ? (
          <Link to="/plans">
            <Button>Ver planos</Button>
          </Link>
        ) : (
          <p className="text-sm text-muted-foreground">Fale com um administrador para fazer upgrade do plano.</p>
        )}
      </CardContent>
    </Card>
  );
}
