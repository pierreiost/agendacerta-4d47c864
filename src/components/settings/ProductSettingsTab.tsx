import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useVenue } from '@/contexts/VenueContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Package } from 'lucide-react';

export function ProductSettingsTab() {
  const { currentVenue, refetchVenues } = useVenue();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const allowNegative = (currentVenue as any)?.allow_negative_stock ?? false;

  const handleToggle = async (checked: boolean) => {
    if (!currentVenue?.id) return;
    setSaving(true);

    const { error } = await supabase
      .from('venues')
      .update({ allow_negative_stock: checked } as any)
      .eq('id', currentVenue.id);

    setSaving(false);

    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Configuração salva!' });
      refetchVenues();
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Configurações de Produtos</CardTitle>
            <CardDescription>
              Gerencie as regras de estoque e venda de produtos
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="allow-negative" className="text-base font-medium">
              Permitir venda com estoque negativo
            </Label>
            <p className="text-sm text-muted-foreground">
              Quando ativado, o sistema permite vender produtos mesmo sem estoque suficiente.
              O saldo ficará negativo até uma nova entrada.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            <Switch
              id="allow-negative"
              checked={allowNegative}
              onCheckedChange={handleToggle}
              disabled={saving}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
